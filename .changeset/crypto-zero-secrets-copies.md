---
"@talismn/crypto": patch
---

the derivation functions leave a `Buffer` seed or key passed to them intact, and zero the copies of keys they hash or discard, also when they throw
