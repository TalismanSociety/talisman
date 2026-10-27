---
"@talismn/chaindata-provider": patch
---

the default chaindata file falls back to jsdelivr only when raw.githubusercontent.com is unreachable or answers with a 5xx, never on a 4xx
