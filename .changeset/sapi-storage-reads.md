---
"@talismn/sapi": minor
---

add fetchStorageKeysPaged and queryStorageAt to list storage keys under a prefix and read values in chunks of 500 keys, with an optional block hash and AbortSignal; getStorageValues reads through queryStorageAt, so it chunks and rejects a response without a change set
