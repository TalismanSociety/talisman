import { bind } from "@react-rxjs/core"
import { currentMigration$, isLoggedIn$, isOnboarded$ } from "@ui/state"
import { combineLatest, map } from "rxjs"

export const [useLoginCheck] = bind(
  combineLatest({
    isLoggedIn: isLoggedIn$,
    isOnboarded: isOnboarded$,
    isMigrating: currentMigration$.pipe(map((currentMigration) => !!currentMigration)),
  })
)
