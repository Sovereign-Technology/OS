# sovereign-canonical

> On-chain-style DAO governance, fully P2P. Canonical truth layer for the Sovereign mesh.

## Contents

| File | Role |
|------|------|
| `src/governance.html` | DAO Governance (v6.0) — proposals, voting, quorum, ratification, broadcast |

## Proposal Types

- Protocol Upgrade
- Treasury
- Trust Modification
- Emergency Override
- Membership

## FSM Invariants

- **INV-10**: Consensus `COMMITTED` requires governance not `FAILED`
- Quorum threshold auto-calculated from live peer count
- FSM-enforced ratification rules
