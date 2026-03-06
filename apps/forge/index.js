/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  FORGE PLATFORM  —  apps/forge/index.js                                 ║
 * ║                                                                          ║
 * ║  App-level bootstrap for the Forge Platform.                             ║
 * ║  Runs after the sovereign stack is loaded.                               ║
 * ║                                                                          ║
 * ║  NOTE: Service Worker registration is handled by sovereign_security.js  ║
 * ║  via _registerSW(), which expects genesis_sw.js in the same directory.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ── PANIC SHORTCUT ──────────────────────────────────────────────────────── */
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    if (window.SovereignKernelBridge) {
      window.SovereignKernelBridge.send({ cmd: 'LOCK_VAULT' });
    }
    if (window.SovereignTransport && typeof window.SovereignTransport.disconnectAll === 'function') {
      window.SovereignTransport.disconnectAll();
    }
    console.warn('[Sovereign Forge] Panic shortcut — vault locked, transport suspended.');
  }
});

/* ── STACK HEALTH CHECK ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  var required = [
    ['sovereign-sdk/shamir',        function () { return typeof window.SovereignShamir !== 'undefined'; }],
    ['sovereign-sdk/security',      function () { return typeof window.sanitize !== 'undefined'; }],
    ['sovereign-kernel/fsm',        function () { return typeof window.SovereignFSM !== 'undefined'; }],
    ['sovereign-runtime/transport', function () { return typeof window.SovereignTransport !== 'undefined'; }],
  ];

  var missing = required
    .filter(function (pair) { return !pair[1](); })
    .map(function (pair) { return pair[0]; });

  if (missing.length > 0) {
    console.error('[Sovereign Forge] Missing stack modules:', missing.join(', '));
    var banner = document.createElement('div');
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#ff4040', 'color:#fff', 'font-family:monospace',
      'font-size:12px', 'padding:10px 16px', 'text-align:center',
    ].join(';');
    banner.textContent = '\u26a0 Sovereign Forge — stack incomplete. Missing: '
      + missing.join(', ')
      + '. Serve over HTTP and check script load order.';
    document.body.prepend(banner);
  } else {
    console.log('[Sovereign Forge] \u2713 Full stack confirmed.');
  }
});
