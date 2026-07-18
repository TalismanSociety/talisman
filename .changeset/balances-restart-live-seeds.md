---
"@talismn/balances": patch
---

Preserve live status across balance pipeline restarts: seeds re-emit previously-live balances with their exact last live result instead of downgrading the snapshot to cache and back. Seeded live status expires after 5 minutes without a confirming module emission, and the periodic stale sweep downgrades seeded balances whose module never reconnects.
