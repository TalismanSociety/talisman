---
"@talismn/balances": patch
---

Preserve live status across balance pipeline restarts: seeds re-emit previously-live balances with their exact last live result instead of downgrading the snapshot to cache and back.
