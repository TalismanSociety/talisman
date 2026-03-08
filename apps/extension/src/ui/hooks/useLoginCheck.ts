import { bind } from "@react-rxjs/core"
import { currentMigration$, isOnboarded$ } from "@ui/state/app"
import { isLoggedIn$ } from "@ui/state/isLoggedIn"
import { combineLatest, map } from "rxjs"

export const [useLoginCheck] = bind(
  combineLatest({
    isLoggedIn: isLoggedIn$,
    isOnboarded: isOnboarded$,
    isMigrating: currentMigration$.pipe(map((currentMigration) => !!currentMigration)),
  })
)
