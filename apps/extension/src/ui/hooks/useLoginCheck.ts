import { bind } from "@react-rxjs/core"
import { combineLatest, map } from "rxjs"

import { isLoggedIn$, isOnboarded$ } from "@ui/state"

export const [useLoginCheck] = bind(
  combineLatest([isLoggedIn$, isOnboarded$]).pipe(
    map(([isLoggedIn, isOnboarded]) => ({ isLoggedIn, isOnboarded })),
  ),
)
