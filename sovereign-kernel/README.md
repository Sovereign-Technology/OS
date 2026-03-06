# sovereign-kernel

> The authoritative state machine and distributed OS kernel for Sovereign.

## Contents

| File | Role |
|------|------|
| `src/sovereign_kernel.js` | Core distributed OS kernel (v1.0) — process scheduling, peer authority, capability routing |
| `src/sovereign_fsm.js` | FSM Kernel (v4.0) — 12 machines, 12 invariants, Merkle attestation |
| `src/genesis_sw.js` | Security Kernel service worker (v5.0) — vault encryption, cover traffic, entropy pool |

## Dependency Graph

```
sovereign-sdk  ←  sovereign-kernel  →  [consumed by all repos]
```

## Invariants

- INV-01 through INV-12 enforced at runtime
- FSM snapshot is Merkle-attested for offline verification
- No invariant can be bypassed from user space
