import { bind } from "@react-rxjs/core"
import { combineLatest, map } from "rxjs"

import { currentMigration$, isLoggedIn$, isOnboarded$ } from "@ui/state"

export const [useLoginCheck] = bind(
  combineLatest({
    isLoggedIn: isLoggedIn$,
    isOnboarded: isOnboarded$,
    isMigrating: currentMigration$.pipe(map((currentMigration) => !!currentMigration)),
  }),
)
