---
"@talismn/util": patch
---

yieldToEventLoop yields at background priority through scheduler.postTask where it exists, so pending messages and IPC replies run first
