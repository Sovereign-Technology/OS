# sovereign-identity

> Self-sovereign identity vault — DIDs, Verifiable Credentials, Shamir key recovery.

## Contents

| File | Role |
|------|------|
| `src/identity.html` | Identity Vault (v6.0) — DID management, W3C VC issue/hold/revoke, key rotation, event history |
| `src/portal.html` | Onboarding portal — new identity creation, backup key export, first-run flow |

## Features

- **W3C Verifiable Credentials** — issue, hold, present, and revoke cryptographically signed credentials
- **Shamir Key Recovery UI** — visual share export, click-to-copy, offline reconstruction
- **Print Recovery Card** — printable backup with all 5 shares
- **Identity suspension** — temporary privacy mode, pause without full lock
- **Key rotation** — rekey vault without losing identity continuity

## Dependencies

```
@sovereign/sdk (sovereign_security, sovereign_shamir)
@sovereign/kernel (FSM: identity machine, credential machine, recovery machine)
```
