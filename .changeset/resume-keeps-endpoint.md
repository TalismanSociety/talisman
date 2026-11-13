---
"@talismn/util": minor
"@talismn/chain-connectors": patch
---

ChainConnectorDot no longer fails requests or moves to another endpoint when the app resumes from the background: its timeouts count only the time the JS runtime ran (`setAwakeTimeout`), and sockets that sat through a long suspension reconnect to the same endpoint. A host whose runtime keeps running while it is cut off (a webview whose app is in the background) marks that time with `setSuspended()`. In a hidden page, timer throttling is held as one suspension until the page is shown, so timeouts don't restart every time a throttled timer runs.
