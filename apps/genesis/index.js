/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  GENESIS NODE  —  apps/genesis/index.js                                 ║
 * ║                                                                          ║
 * ║  App-level bootstrap for the Genesis Node.                               ║
 * ║  Runs after the full sovereign stack is loaded.                          ║
 * ║                                                                          ║
 * ║  NOTE: Service Worker registration is handled by sovereign_security.js  ║
 * ║  via _registerSW(), which expects genesis_sw.js in the same directory   ║
 * ║  as the page. Do not re-register it here.                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── PANIC SHORTCUT ─────────────────────────────────────────────────────────
 * Ctrl+Shift+P: immediately lock the vault and drop transport.
 * Mirrors the shortcut registered in genesis_sw.js at the SW level.
 * ─────────────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    if (window.SovereignKernelBridge) {
      window.SovereignKernelBridge.send({ cmd: 'LOCK_VAULT' });
    }
    if (window.SovereignTransport && typeof window.SovereignTransport.disconnectAll === 'function') {
      window.SovereignTransport.disconnectAll();
    }
    console.warn('[Sovereign Genesis] Panic shortcut — vault locked, transport suspended.');
  }
});

/* ── STACK HEALTH CHECK ─────────────────────────────────────────────────────
 * Runs after DOMContentLoaded. Surfaces a visible error banner in the
 * unlikely event a module failed to load rather than silently black-screening.
 * ─────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  var required = [
    ['sovereign-sdk/shamir',        function () { return typeof window.SovereignShamir !== 'undefined'; }],
    ['sovereign-sdk/security',      function () { return typeof window.sanitize !== 'undefined'; }],
    ['sovereign-kernel/fsm',        function () { return typeof window.SovereignFSM !== 'undefined'; }],
    ['sovereign-runtime/transport', function () { return typeof window.SovereignTransport !== 'undefined'; }],
    ['sovereign-kernel/kernel',     function () { return typeof window.SovereignKernel !== 'undefined'; }],
  ];

  var missing = required
    .filter(function (pair) { return !pair[1](); })
    .map(function (pair) { return pair[0]; });

  if (missing.length > 0) {
    console.error('[Sovereign Genesis] Missing stack modules:', missing.join(', '));
    var banner = document.createElement('div');
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#ff4040', 'color:#fff', 'font-family:monospace',
      'font-size:12px', 'padding:10px 16px', 'text-align:center',
    ].join(';');
    banner.textContent = '\u26a0 Sovereign Genesis — stack incomplete. Missing: '
      + missing.join(', ')
      + '. Serve over HTTP (not file://) and check script load order.';
    document.body.prepend(banner);
  } else {
    console.log('[Sovereign Genesis] \u2713 Full stack confirmed.');
  }
});
