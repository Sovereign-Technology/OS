/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  FORGE PLATFORM  —  apps/forge/index.js                                 ║
 * ║                                                                          ║
 * ║  Entry point for the Sovereign Forge Platform.                           ║
 * ║  Loads the sovereign stack, registers the security kernel service        ║
 * ║  worker, and initializes the Forge social + studio + marketplace shell.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── 1. LOAD ORDER ───────────────────────────────────────────────────────────
 *
 *   sovereign_shamir.js      (GF-256 Shamir SSS — no deps)
 *       ↓
 *   sovereign_security.js    (crypto utils, vault I/O)
 *       ↓
 *   sovereign_fsm.js         (FSM kernel, 12 machines)
 *       ↓
 *   transport.js             (transport layer — DHT, Double Ratchet, KDF)
 *       ↓
 *   [this file]              (forge app init)
 *
 *  Note: sovereign_kernel.js is optional for Forge — the FSM + transport
 *  layer is sufficient for social, studio, and marketplace features.
 *  Include it in index.html if full OS-level authority routing is needed.
 * ────────────────────────────────────────────────────────────────────────── */

/* ── 2. FALLBACK GUARD ──────────────────────────────────────────────────────*/
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

/* ── 3. FORGE CAPABILITY REGISTRY ───────────────────────────────────────────
 *  Declares which Sovereign modules Forge depends on and what each provides.
 *  Used for the stack health check and the capability routing layer.
 * ────────────────────────────────────────────────────────────────────────── */
window.SovereignForge = window.SovereignForge ?? {
  capabilities: {
    social:      { module: 'sovereign-social',   status: 'pending' },
    studio:      { module: 'sovereign-ai',        status: 'pending' },
    wallet:      { module: 'sovereign-wallet',    status: 'pending' },
    identity:    { module: 'sovereign-identity',  status: 'pending' },
    governance:  { module: 'sovereign-canonical', status: 'pending' },
  },

  /** Mark a capability as ready. Called by each sub-module on init. */
  register(name) {
    if (this.capabilities[name]) {
      this.capabilities[name].status = 'ready';
      window.dispatchEvent(new CustomEvent('forge:capability:ready', { detail: { name } }));
    }
  },

  /** Returns true only when all capabilities are ready. */
  get allReady() {
    return Object.values(this.capabilities).every(c => c.status === 'ready');
  }
};

/* ── 4. SERVICE WORKER REGISTRATION ─────────────────────────────────────────
 *  Forge shares the same genesis_sw.js Security Kernel as the Genesis Node.
 *  Key isolation, vault encryption, and double ratchet are all handled by
 *  the SW — Forge never holds raw key material in the main tab.
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

      const reg = await navigator.serviceWorker.register(swPath, { scope: '/' });

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
        console.log('[Sovereign Forge] SW bridge installed — key isolation active.');
        window.SovereignForge.register('identity');
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
      if (reg.active) fire();
      else {
        const pending = reg.installing || reg.waiting;
        if (pending) pending.addEventListener('statechange', function h() {
          if (this.state === 'activated') { this.removeEventListener('statechange', h); fire(); }
        });
      }

    } catch (e) {
      console.warn('[Sovereign Forge] SW registration failed:', e.message);
    }
  })();
}

/* ── 5. SW MESSAGE HANDLER ──────────────────────────────────────────────────*/
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    const { event, reason } = e.data ?? {};
    if (event === 'PANIC_LOCKDOWN') {
      window.dispatchEvent(new CustomEvent('sovereign:panic', { detail: { reason } }));
    }
    if (event === 'VAULT_LOCKED') {
      window.dispatchEvent(new CustomEvent('sovereign:vault:locked'));
    }
  });
}

/* ── 6. PANIC SHORTCUT ──────────────────────────────────────────────────────*/
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    window.SovereignKernelBridge?.send({ cmd: 'LOCK_VAULT' });
    window.SovereignTransport?.disconnectAll?.();
    window.dispatchEvent(new CustomEvent('sovereign:panic', {
      detail: { reason: 'user-initiated' }
    }));
    console.warn('[Sovereign Forge] Panic shortcut triggered — vault locked, transport suspended.');
  }
});

/* ── 7. TRANSPORT READY HOOK ────────────────────────────────────────────────
 *  When the transport layer is available, register the social and wallet
 *  capabilities so the Forge shell knows the mesh is live.
 * ────────────────────────────────────────────────────────────────────────── */
window.addEventListener('sovereign:sw:ready', () => {
  if (window.SovereignTransport) {
    window.SovereignForge.register('social');
    window.SovereignForge.register('wallet');
    window.SovereignForge.register('studio');
    window.SovereignForge.register('governance');
  }
});

/* ── 8. STACK HEALTH CHECK ──────────────────────────────────────────────────*/
window.addEventListener('DOMContentLoaded', () => {
  const required = {
    'sovereign-sdk/shamir':        () => typeof window.SovereignShamir !== 'undefined',
    'sovereign-sdk/security':      () => typeof window.sanitize !== 'undefined',
    'sovereign-kernel/fsm':        () => typeof window.SovereignFSM !== 'undefined',
    'sovereign-runtime/transport': () => typeof window.SovereignTransport !== 'undefined',
  };

  const missing = Object.entries(required)
    .filter(([, check]) => !check())
    .map(([name]) => name);

  if (missing.length) {
    console.error('[Sovereign Forge] Missing stack modules:', missing);
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#ff4040;color:#fff;font-family:monospace;
      font-size:12px;padding:8px 16px;text-align:center;
    `;
    banner.textContent = `⚠ Sovereign Forge — missing: ${missing.join(', ')}. `
      + 'Serve over HTTP and check load order in index.html.';
    document.body.prepend(banner);
  } else {
    console.log('[Sovereign Forge] ✓ Full stack loaded.');
  }
});
