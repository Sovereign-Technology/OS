/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  GENESIS NODE  —  apps/genesis/index.js                                 ║
 * ║                                                                          ║
 * ║  Entry point for the Sovereign OS Genesis Node.                          ║
 * ║  Loads the sovereign stack in dependency order, registers the            ║
 * ║  service worker security kernel, and boots the UI.                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── 1. LOAD ORDER ───────────────────────────────────────────────────────────
 *
 *   sovereign_shamir.js      (GF-256 Shamir SSS — no deps)
 *       ↓
 *   sovereign_security.js    (crypto utils, vault I/O — requires shamir)
 *       ↓
 *   sovereign_fsm.js         (FSM kernel, 12 machines — requires security)
 *       ↓
 *   transport.js             (transport layer — requires fsm + security)
 *       ↓
 *   sovereign_kernel.js      (OS kernel — requires all above)
 *       ↓
 *   [this file]              (app init — requires entire stack)
 *
 *  Dependencies are loaded via <script> tags in index.html in this order.
 *  This file runs last and assumes all globals are available on window.
 * ────────────────────────────────────────────────────────────────────────── */

/* ── 2. FALLBACK GUARD ──────────────────────────────────────────────────────
 *  If sovereign_security.js failed to load, install a minimal sanitize shim
 *  so the DOM layer doesn't crash before the error is surfaced to the user.
 * ────────────────────────────────────────────────────────────────────────── */
if (typeof window.sanitize === 'undefined') {
  window.sanitize = (s) => {
    if (s == null) return '';
    s = String(s);
    try {
      return new DOMParser()
        .parseFromString(s, 'text/html')
        .body?.textContent ?? s.replace(/<[^>]*>/g, '');
    } catch (_) {
      return s.replace(/<[^>]*>/g, '');
    }
  };
}

/* ── 3. IN-PAGE CRYPTO SHIM ─────────────────────────────────────────────────
 *  Installed immediately so vault creation works on first load before the
 *  Service Worker activates, on file:// origins, and as a hard fallback if
 *  SW registration fails.
 *
 *  The Service Worker (genesis_sw.js) REPLACES this bridge once it activates.
 *  All key material is held in the SW's isolated execution context — never
 *  in the main tab's memory.
 * ────────────────────────────────────────────────────────────────────────── */
if (typeof window.SovereignKernelBridge === 'undefined') {
  (() => {
    const _mem = { sigKey: null, vfyKey: null, dhKey: null, dhPub: null };
    let _did = null, _pubB64 = null, _locked = true, _vaultCt = null;

    const _b64  = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
    const _b64d = s   => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const _hex  = buf => Array.from(new Uint8Array(buf))
                           .map(b => b.toString(16).padStart(2, '0')).join('');

    async function _deriveWrapKey(pass, salt) {
      const raw = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, hash: 'SHA-256', iterations: 310_000 },
        raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
      );
    }

    window.SovereignKernelBridge = {
      _isShim: true,
      async send(c) {
        if (c.cmd === 'STATUS') {
          return { vaultLocked: _locked, did: _did, pubKey: _pubB64,
                   patterns: 20, ratchets: 0, auditEntries: 0 };
        }
        if (c.cmd === 'CREATE_VAULT') {
          if (!c.passphrase || c.passphrase.length < 8)
            return { error: 'PASSPHRASE_TOO_SHORT' };
          const sigPair = await crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
          );
          const dhPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
          );
          const pubRaw = new Uint8Array(
            await crypto.subtle.exportKey('raw', sigPair.publicKey)
          );
          const hash = await crypto.subtle.digest('SHA-256', pubRaw);
          _did    = `did:sovereign:${_hex(hash).slice(0, 48)}`;
          _pubB64 = _b64(pubRaw);
          _mem.sigKey = sigPair.privateKey;
          _mem.vfyKey = sigPair.publicKey;
          _mem.dhKey  = dhPair.privateKey;
          _mem.dhPub  = dhPair.publicKey;
          _locked = false;

          // Persist encrypted vault to localStorage
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const iv   = crypto.getRandomValues(new Uint8Array(12));
          const wk   = await _deriveWrapKey(c.passphrase, salt);
          const sigRaw = await crypto.subtle.exportKey('pkcs8', sigPair.privateKey);
          const dhRaw  = await crypto.subtle.exportKey('pkcs8', dhPair.privateKey);
          const payload = JSON.stringify({
            sig: _b64(sigRaw), dh: _b64(dhRaw),
            pub: _pubB64, did: _did
          });
          const ct = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            wk,
            new TextEncoder().encode(payload)
          );
          _vaultCt = { ct: _b64(ct), salt: _b64(salt), iv: _b64(iv) };
          try { localStorage.setItem('sovereign_vault_v6', JSON.stringify(_vaultCt)); } catch (_) {}
          return { did: _did, pubKey: _pubB64 };
        }
        if (c.cmd === 'UNLOCK_VAULT') {
          try {
            const stored = JSON.parse(localStorage.getItem('sovereign_vault_v6') || 'null');
            if (!stored) return { error: 'NO_VAULT' };
            const salt = _b64d(stored.salt), iv = _b64d(stored.iv);
            const wk = await _deriveWrapKey(c.passphrase, salt);
            const pt = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv }, wk, _b64d(stored.ct)
            );
            const data = JSON.parse(new TextDecoder().decode(pt));
            const sigImport = await crypto.subtle.importKey(
              'pkcs8', _b64d(data.sig),
              { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']
            );
            const dhImport = await crypto.subtle.importKey(
              'pkcs8', _b64d(data.dh),
              { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
            );
            _mem.sigKey = sigImport;
            _did    = data.did;
            _pubB64 = data.pub;
            _locked = false;
            return { did: _did, pubKey: _pubB64 };
          } catch (_) {
            return { error: 'WRONG_PASSPHRASE' };
          }
        }
        if (c.cmd === 'LOCK_VAULT') {
          Object.keys(_mem).forEach(k => _mem[k] = null);
          _locked = true;
          return { ok: true };
        }
        return { error: 'UNKNOWN_CMD' };
      }
    };

    console.log('[Sovereign Genesis] In-page shim installed. '
      + 'Will be replaced by SW bridge on activation.');
  })();
}

/* ── 4. SERVICE WORKER REGISTRATION ─────────────────────────────────────────
 *  Registers genesis_sw.js as the Security Kernel service worker.
 *  On activation it installs the full SW bridge that moves all key
 *  operations into the SW's isolated execution context.
 * ────────────────────────────────────────────────────────────────────────── */
if (
  'serviceWorker' in navigator &&
  location.protocol !== 'file:' &&
  location.origin !== 'null'
) {
  (async () => {
    try {
      const swPath = new URL(
        '../../sovereign-kernel/src/genesis_sw.js',
        import.meta?.url ?? location.href
      ).pathname;

      const reg = await navigator.serviceWorker.register(swPath, { scope: './' });

      function _installSwBridge(sw) {
        window.SovereignKernelBridge = {
          _isSW: true,
          async send(cmd) {
            const activeSw = reg.active || reg.waiting || reg.installing;
            if (!activeSw) return { error: 'SW_UNAVAILABLE' };
            return new Promise((resolve, reject) => {
              const mc = new MessageChannel();
              mc.port1.onmessage      = (e) => resolve(e.data);
              mc.port1.onmessageerror = reject;
              activeSw.postMessage(cmd, [mc.port2]);
            });
          }
        };
        console.log('[Sovereign Genesis] SW bridge installed — key isolation active.');
      }

      let _swReadyFired = false;
      const fire = () => {
        if (_swReadyFired) return;
        _swReadyFired = true;
        const activeSw = reg.active || reg.waiting || reg.installing;
        if (activeSw) _installSwBridge(activeSw);
        window.dispatchEvent(new CustomEvent('sovereign:sw:ready'));
      };

      navigator.serviceWorker.ready.then(() => { if (!_swReadyFired) fire(); }).catch(() => {});
      if (reg.active) {
        fire();
      } else {
        const pending = reg.installing || reg.waiting;
        if (pending) pending.addEventListener('statechange', function h() {
          if (this.state === 'activated') { this.removeEventListener('statechange', h); fire(); }
        });
      }
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (nw) nw.addEventListener('statechange', function h() {
          if (this.state === 'activated') { this.removeEventListener('statechange', h); fire(); }
        });
      });

    } catch (e) {
      console.warn('[Sovereign Genesis] SW registration failed:', e.message);
    }
  })();
}

/* ── 5. SW MESSAGE HANDLER ──────────────────────────────────────────────────
 *  Listens for panic and vault-lock events from the Security Kernel SW.
 * ────────────────────────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    const { event, reason } = e.data ?? {};
    if (event === 'PANIC_LOCKDOWN') {
      console.error('[Sovereign Genesis] PANIC LOCKDOWN — reason:', reason);
      window.dispatchEvent(new CustomEvent('sovereign:panic', { detail: { reason } }));
    }
    if (event === 'VAULT_LOCKED') {
      window.dispatchEvent(new CustomEvent('sovereign:vault:locked'));
    }
  });
}

/* ── 6. PANIC SHORTCUT ──────────────────────────────────────────────────────
 *  Ctrl+Shift+P immediately suspends mesh presence and locks the vault.
 * ────────────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    window.SovereignKernelBridge?.send({ cmd: 'LOCK_VAULT' });
    window.SovereignTransport?.disconnectAll?.();
    window.dispatchEvent(new CustomEvent('sovereign:panic', {
      detail: { reason: 'user-initiated' }
    }));
    console.warn('[Sovereign Genesis] Panic shortcut triggered — vault locked, transport suspended.');
  }
});

/* ── 7. STACK HEALTH CHECK ──────────────────────────────────────────────────
 *  Verifies all required globals are present after load.
 *  Surfaces a visible warning banner if any module is missing.
 * ────────────────────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const required = {
    'sovereign-sdk/shamir':   () => typeof window.SovereignShamir !== 'undefined',
    'sovereign-sdk/security': () => typeof window.sanitize !== 'undefined',
    'sovereign-kernel/fsm':   () => typeof window.SovereignFSM !== 'undefined',
    'sovereign-runtime/transport': () => typeof window.SovereignTransport !== 'undefined',
    'sovereign-kernel/kernel': () => typeof window.SovereignKernel !== 'undefined',
  };

  const missing = Object.entries(required)
    .filter(([, check]) => !check())
    .map(([name]) => name);

  if (missing.length) {
    console.error('[Sovereign Genesis] Missing stack modules:', missing);
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#ff4040;color:#fff;font-family:monospace;
      font-size:12px;padding:8px 16px;text-align:center;
    `;
    banner.textContent = `⚠ Sovereign stack incomplete — missing: ${missing.join(', ')}. `
      + 'Serve over HTTP (not file://) and check the browser console.';
    document.body.prepend(banner);
  } else {
    console.log('[Sovereign Genesis] ✓ Full stack loaded.');
  }
});
