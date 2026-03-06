# sovereign-social

> End-to-end encrypted social layer — real-time chat, layered mail, and community square.

## Contents

| File | Role |
|------|------|
| `src/messenger.html` | P2P Messenger — real-time encrypted chat, DID-addressed, file attachments |
| `src/mail.html` | Sovereign Mail — 3-layer encrypted mail system (inbox, feed, archive) |
| `src/square.html` | Forge Square — public community hub, DMs, channels, direct messages |

## Features

- All messages encrypted end-to-end using identity keys from `sovereign-identity`
- DID-addressed delivery — no phone numbers, no emails
- File attachment support
- Store-and-forward via `sovereign-runtime` transport queue
