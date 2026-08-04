---
"@talismn/balances": patch
---

pin every read of a Bittensor dtao balances poll to one block, and read basket entitlement from the per-validator positions call only (a coldkey-wide total read from another block surfaced a phantom validator-less claimable row)
