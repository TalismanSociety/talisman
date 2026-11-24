---
"@talismn/chaindata-provider": patch
---

the default chaindata file falls back to jsdelivr when raw.githubusercontent.com is unreachable or answers with a 5xx, 429 or 403, and no longer on a 404
