# ⬡ Sovereign OS

**A self-sovereign, peer-to-peer operating environment that runs entirely in your browser.**

No servers. No accounts. No surveillance. Every key, every message, every file — stored on your device, yours alone.

> *"The tools of sovereignty should be sovereign themselves."*

---

## What Is This?

Sovereign OS is a fully decentralized operating environment that runs as a collection of static HTML/JS files in any modern browser. There is no backend, no database, no cloud service, and no account system. Your cryptographic identity is generated locally, encrypted with your passphrase, and stored in your browser's vault. Nothing leaves your device unless you explicitly broadcast it to peers.

The system is built around three core ideas:

**Identity is the OS.** Everything in Sovereign — messages, votes, payments, credentials, apps — is signed by your local key pair. Your DID (Decentralized Identifier) is your account, your address, and your authority all in one.

**State is law.** The FSM (Finite State Machine) kernel enforces 12 invariants at runtime that cannot be bypassed from user space. No component can act outside its allowed state transitions. The FSM snapshot is Merkle-attested and verifiable offline.

**The mesh is the server.** Peers communicate via WebRTC (direct) and MQTT (relayed). The transport layer handles failover, reputation scoring, CRDT sync, and store-and-forward — so messages reach their destination even when peers are temporarily offline.

---

## Quick Start

**No install. No build. No server required for most features.**

```bash
# Clone or download and unzip, then serve over HTTP
# (Service Workers require HTTP — file:// will not work)

npx serve .
# or
python3 -m http.server 8080
```

Then open `apps/genesis/index.html` in Chrome, Brave, Firefox, or Edge.

**First run:**
1. The Genesis Node loads and prompts you to create an identity
2. Click **Generate Identity** and set a strong passphrase
3. Your key pair is generated in a Web Worker, encrypted, and stored in the vault
4. The transport layer connects to the public relay automatically
5. Share your DID or scan a QR code to invite peers

---

## Repository Structure

This is an npm workspace monorepo. Each directory is a standalone package with its own `package.json` and `README.md`. Apps sit on top and consume the packages as dependencies.

```
sovereign-os/
│
├── sovereign-sdk            Cryptographic primitives — load this first
├── sovereign-kernel         FSM state machine, OS kernel, service worker
│
├── sovereign-identity       DID vault, W3C Verifiable Credentials, key recovery
├── sovereign-canonical      DAO governance — proposals, voting, consensus
├── sovereign-evaluator      Adversarial security audit and threat simulation
│
├── sovereign-runtime        Transport layer, peer mesh, OS authority stack UI
├── sovereign-explorer       Network search, relay hub, cross-network bridge
│
├── sovereign-social         Messenger, layered mail, public square
├── sovereign-wallet         Self-custodial wallet, AI-governed payments
├── sovereign-receipts       Tamper-evident transaction receipts and audit log
│
├── sovereign-ai             AI Studio — build, publish, and monetize sovereign apps
├── sovereign-docs           Canonical documentation and license
│
└── apps/
    ├── genesis              Genesis Node — primary OS entry point (index.html)
    └── forge                Forge Platform — social feed, studio, marketplace
```

---

## Package Reference

### `sovereign-sdk`
The lowest-level package. Must be loaded before anything else.

- `sovereign_security.js` — Key derivation, ECDSA signing, AES-256-GCM encryption, vault I/O, sanitization utilities
- `sovereign_shamir.js` — Real t-of-n Shamir Secret Sharing over GF(256) with Lagrange interpolation

No dependencies. Everything else depends on this.

---

### `sovereign-kernel`
The authoritative state machine and distributed OS kernel.

- `sovereign_kernel.js` — Core distributed OS kernel: process scheduling, peer authority, capability routing
- `sovereign_fsm.js` — FSM Kernel v4.0: 12 state machines, 12 invariants, Merkle-attested snapshots
- `genesis_sw.js` — Security Kernel service worker v5.0: vault encryption, cover traffic, entropy pool mixing

**The 12 FSM machines:** `identity` · `transport` · `vault` · `messaging` · `governance` · `trust` · `asset` · `session` · `sync` · `credential` · `consensus` · `recovery`

**Critical invariants:**
| Invariant | Rule |
|-----------|------|
| INV-09 | Credential `PRESENTING` requires identity `READY` |
| INV-10 | Consensus `COMMITTED` requires governance not `FAILED` |
| INV-11 | Recovery `RECONSTRUCTING` requires vault `LOCKED` — no dual-unlock |
| INV-12 | Sync `SYNCED` requires transport not `OFFLINE` |

---

### `sovereign-identity`
The identity vault and onboarding portal.

- `identity.html` — Identity Vault v6.0: full DID management, W3C Verifiable Credential lifecycle, key rotation, Shamir UI, print recovery card, tamper-evident event history
- `portal.html` — Onboarding gateway: first-run identity creation, backup key export, QR code sharing

**Verifiable Credentials** follow a simplified W3C VC Data Model — signed with the holder's ECDSA P-256 key, portable as base64 packets, verifiable by any peer who holds the issuer's public key.

**Key recovery** uses 3-of-5 Shamir shares. Each share can be exported individually, printed on a recovery card, or stored offline. Reconstruction requires any 3 of the 5 shares — no single share leaks information on its own.

---

### `sovereign-canonical`
The governance layer. Canonical truth for the mesh.

- `governance.html` — DAO Governance v6.0: P2P proposals, FSM-enforced quorum voting, live consensus tallying, broadcast to all peers

**Proposal lifecycle:**
```
DRAFT → OPEN → VOTING → TALLYING → RATIFIED | REJECTED | EXPIRED
```

**Proposal types:** Protocol Upgrade · Treasury · Trust Modification · Emergency Override · Membership

Quorum is calculated automatically from the live peer count. Each vote is signed with the voter's identity key and broadcast via `SovereignTransport.broadcast()`. The `consensus` FSM machine enforces that `COMMITTED` state is only reachable when governance has not `FAILED`.

---

### `sovereign-evaluator`
Adversarial security and audit command platform.

- `attack.html` — Attack Command: identity-bound adversarial sessions, threat simulation, network vulnerability scanning, security audit UI

Access requires a bound and verified identity. The evaluator is designed for security researchers and node operators to test Sovereign deployments against known attack patterns.

---

### `sovereign-runtime`
The transport layer and OS authority stack.

- `transport.js` — Transport Layer v4.0: WebRTC + MQTT, multi-relay failover, peer reputation, CRDT sync, ACK delivery, bandwidth metering
- `os.html` — Sovereign OS v7: full authority stack UI, Layer 0 entropy identity kernel dashboard

**Transport features in detail:**

| Feature | How it works |
|---------|-------------|
| Multi-relay failover | Maintains a priority-ordered relay list; on disconnect, tries next relay with exponential backoff |
| Peer reputation scoring | Tracks latency, uptime, and message drop rate per peer; scores 0–100; peers below 10 or idle 5+ min are pruned |
| Store-and-forward queue | Encrypts and queues messages for offline peers (up to 512KB/peer); drains automatically on reconnect |
| CRDT sync | Last-Write-Wins with vector clock; use `syncSet(key, value)` / `syncGet(key)` for eventually-consistent shared state |
| Reliable send | `sendReliable(did, msg)` waits for an ACK and retries with timeout — guaranteed delivery for critical messages |
| Protocol versioning | Version exchanged during handshake; incompatible peers are rejected gracefully |
| Relay health probing | 30-second keepalive ping; PONG RTT measured and included in reputation score |
| Adaptive peer pruning | Mesh is pruned every 2 minutes; low-reputation and stale peers are removed from routing tables |
| Multi-path redundant send | DHT routing sends via multiple paths with deduplication at the receiver |

---

### `sovereign-explorer`
Network discovery and cross-network interop.

- `search.html` — Sovereign Search: decentralized network index, peer and content discovery across the mesh
- `relay.html` — Relay Hub: live WebRTC peer count and MQTT signaling status, relay health dashboard
- `bridge.html` — Network Bridge: cross-network identity translation between pubkey and npub formats

---

### `sovereign-social`
End-to-end encrypted communications.

- `messenger.html` — P2P Messenger: real-time encrypted chat, DID-addressed, file attachments
- `mail.html` — Sovereign Mail: 3-layer encrypted mail system (inbox · feed · archive)
- `square.html` — Forge Square: public community hub, channels, direct messages

All messages are encrypted using identity keys from `sovereign-identity`. Delivery uses the store-and-forward queue in `sovereign-runtime` so messages reach peers even when they're temporarily offline.

---

### `sovereign-wallet` and `sovereign-receipts`
Both are sourced from `finance.html`, which serves dual roles depending on active view:

- **sovereign-wallet** — Balance display, send/receive payments, AI-governed payment authorization. Private keys never leave the device.
- **sovereign-receipts** — Cryptographically signed transaction receipt log, tamper-evident audit trail, exportable receipt archive.

---

### `sovereign-ai`
The sovereign app builder.

- `studio.html` — Forge Studio: AI-assisted app development, publish to the Sovereign marketplace, monetize via `sovereign-wallet` payments, manage all published apps from a personal dashboard

---

### `sovereign-docs`
Canonical documentation, architecture diagrams, and the license. See [`sovereign-docs/README.md`](./sovereign-docs/README.md) for the full v6.0 changelog and detailed security model comparison table.

---

## Apps

Apps sit on top of all packages. They consume the repos as dependencies and provide the full user-facing experience.

### `apps/genesis` — Genesis Node
The primary OS entry point. `index.html` bootstraps the entire Sovereign stack: it loads identity, connects to the mesh, displays the network map, live peer count, and message threads, and links out to all other apps. This is the file you open first.

### `apps/forge` — Forge Platform
The community and creator hub. `forge.html` hosts the social feed, AI Studio, marketplace, and full account management UI. It integrates `sovereign-social` (Square), `sovereign-ai` (Studio), and `sovereign-wallet` (marketplace payments) into a single shell.

---

## Script Load Order

All pages share the same dependency chain. The load order is strict:

```
sovereign_shamir.js
    ↓
sovereign_security.js
    ↓
sovereign_kernel.js  +  sovereign_fsm.js  +  genesis_sw.js (as Service Worker)
    ↓
transport.js
    ↓
[page-specific logic]
```

Violating this order will cause `undefined` reference errors. Every HTML page in the `src/` directories includes these in the correct sequence.

---

## Security Model

Sovereign's security model is built on the principle that **no component is trusted by default** — not the relay, not the peer, not even the local app tab. Every action is verified against identity keys and FSM state.

| Property | Status |
|----------|--------|
| Private key never in tab memory | ✅ Key operations run in a Web Worker |
| Key encrypted at rest | ✅ AES-256-GCM with passphrase-derived key |
| Shamir key recovery | ✅ 3-of-5 shares, GF(256), printable backup card |
| Deniable vault | ✅ Vault lock indistinguishable from empty |
| Forward secrecy | ✅ Double Ratchet protocol |
| FSM invariant enforcement | ✅ 12 machines, 12 invariants, runtime-enforced |
| FSM snapshot attestation | ✅ Merkle-rooted, offline-verifiable |
| Relay failover | ✅ Automatic, priority-based with backoff |
| Peer reputation and pruning | ✅ Eclipse attack mitigation |
| CRDT sync | ✅ LWW with vector clock |
| Store-and-forward | ✅ 512KB/peer encrypted queue |
| W3C Verifiable Credentials | ✅ Signed, portable, revocable |
| DAO Governance | ✅ Full P2P DAO with quorum enforcement |
| Identity suspension | ✅ Privacy mode — pause mesh presence without locking vault |
| Protocol versioning | ✅ Handshake-time negotiation |
| Cover traffic | ✅ Timing jitter, entropy pool mixing |

**Panic shortcut:** `Ctrl+Shift+P` on the identity page immediately suspends mesh presence.

---

## License

Sovereign is dual-licensed. See [`sovereign-docs/LICENSE.md`](./sovereign-docs/LICENSE.md) for full terms.

**License A — Personal & Open Source (free):** For individuals, researchers, students, and open-source projects.

**License B — Commercial & Institutional (contact for terms):** Required for corporations, governments, military, law enforcement, and revenue-generating organizations.

Sovereign may **not** be used for mass surveillance, cryptographic backdooring, or targeting individuals based on protected characteristics.

Contact **iconoclastdao@gmail.com** for commercial licensing inquiries.

---

## Author

**James Chapman** (XheCarpenXer) — iconoclastdao@gmail.com  
An Iconoclast DAO project. Built by hand. Owned by no one except its creator and the people who use it.
