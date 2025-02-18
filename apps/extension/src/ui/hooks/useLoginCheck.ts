import { bind } from "@react-rxjs/core"
import { combineLatest, map } from "rxjs"

import { currentMigration$, isLoggedIn$, isOnboarded$ } from "@ui/state"

export const [useLoginCheck] = bind(
  combineLatest([isLoggedIn$, isOnboarded$, currentMigration$]).pipe(
    map(([isLoggedIn, isOnboarded, currentMigration]) => ({
      isLoggedIn,
      isOnboarded,
      isMigrating: !!currentMigration,
    })),
  ),
)
