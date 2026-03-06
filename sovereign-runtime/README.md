# sovereign-runtime

> Transport layer and identity-local authority stack runtime for Sovereign OS.

## Contents

| File | Role |
|------|------|
| `src/transport.js` | Transport Layer (v4.0) — WebRTC/MQTT, multi-relay failover, CRDT sync, ACK, bandwidth metering |
| `src/os.html` | Sovereign OS (v7.0) — full authority stack UI, Layer 0 entropy identity kernel |

## Transport Features

- Multi-relay failover with exponential backoff
- Peer reputation scoring (latency, uptime, drop rate)
- Store-and-forward encrypted offline queue (512KB/peer)
- CRDT sync — Last-Write-Wins with vector clock
- Reliable send with ACK + retry
- Adaptive peer pruning every 2m
- Multi-path redundant send via DHT routing

## FSM Invariants

- **INV-12**: Sync `SYNCED` requires transport not `OFFLINE`
- `transport.FAILOVER` state managed automatically
