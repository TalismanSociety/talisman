---
"@talismn/util": minor
"@talismn/chain-connectors": patch
---

ChainConnectorDot no longer fails requests or moves to another endpoint when the app resumes from the background: its timeouts count only the time the JS runtime ran (`setAwakeTimeout`), and sockets that sat through a long suspension reconnect to the same endpoint
