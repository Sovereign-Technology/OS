# sovereign-sdk

> Shared cryptographic primitives. Must be loaded before all other Sovereign modules.

## Contents

| File | Role |
|------|------|
| `src/sovereign_security.js` | Security utilities (v3.0) — key derivation, signing, encryption, vault I/O |
| `src/sovereign_shamir.js` | Shamir Secret Sharing (v1.0) — real t-of-n over GF(256) with Lagrange interpolation |

## Usage

```html
<script src="sovereign_shamir.js"></script>
<script src="sovereign_security.js"></script>
<!-- All other Sovereign scripts -->
```

> **Load order is critical.** `sovereign_shamir.js` → `sovereign_security.js` → everything else.
