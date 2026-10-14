---
"@talismn/balances": patch
---

a module stream that errors now reports every id it owns as failed and resubscribes instead of completing and replaying its last value. The delay doubles from 10 seconds on each failure in a row, up to 5 minutes, and resets on real data. A polkadot network whose spec version cannot be fetched fails every module instead of handing them an empty mini metadata list
