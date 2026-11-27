---
"@talismn/util": patch
"@talismn/chain-connectors": patch
"@talismn/balances": patch
---

Suspension timers work in a service worker whose `document` is a shim, and a timeout cancelled from a resume listener no longer fires. ChainConnectorDot keeps the socket of an extrinsic in flight or watched across a long suspension, leaves a rate-limiting endpoint when a resume comes during the switch, and keeps the endpoint once more after a resume whose first event is a socket error. dTAO polls read the best block once per poll, so an unreachable chain is reported after one request timeout
