---
"@talismn/balances": patch
---

a module stream that errors now reports every id it owns as failed and resubscribes after 10 seconds instead of completing and replaying its last value
