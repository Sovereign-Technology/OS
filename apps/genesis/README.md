# app: genesis

> The Sovereign OS entry point — Genesis Node.

`index.html` is the primary shell. It bootstraps identity, peers, messages, and the network map. All other repos are consumed as modules.

## What it does

- Bootstraps the full sovereign stack on load
- Displays live peer count, network map, and message threads
- Links to all major Sovereign apps
- Requires: all `@sovereign/*` packages to be loaded in correct order
