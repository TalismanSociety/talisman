---
"@talismn/balances": patch
---

dTAO balance polls read each block once, send their independent reads together, and read the root stake unlock interval at most once every 10 minutes per runtime
