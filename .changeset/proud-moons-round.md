---
"@talismn/balances": patch
---

add `taoToAlphaCeil` for user-facing must-keep/must-send alpha minimums: the chain floors the alpha→TAO conversion when checking its TAO-denominated thresholds, so these minimums must round up — a floored value can sit one planck under the real bound and fail the check (or get the position force-swept) when met exactly
