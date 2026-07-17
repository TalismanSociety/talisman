---
"@talismn/chaindata-provider": patch
---

Serialize dynamic-token writes: concurrent `registerDynamicTokens`/`syncDynamicTokens` calls interleaved their read-merge-write cycles, so a later write could silently drop tokens the earlier one just added — visible as dTAO (and SPL) balances flickering in and out of the portfolio while balance modules register tokens concurrently (e.g. during the post-restore discovery storm).
