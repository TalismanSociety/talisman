import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, Suspense } from "react"

import { AModePrimaryActions } from "./AModePrimaryActions"
import { AModeShortcutGrid } from "./AModeShortcutGrid"
import { AModeStats } from "./AModeStats"
import { useAModeFavourites } from "./useAModeFavourites"
import { useAModeShortcuts } from "./useAModeShortcuts"

const POPUP_VISIBLE_GROUPS = 1

export const AModePanel: FC = () => {
  const { primary, groups } = useAModeShortcuts()
  const favourites = useAModeFavourites(groups)

  return (
    <div className="flex w-full flex-col gap-4" data-testid="a-mode-panel">
      <AModePrimaryActions actions={primary} />
      <Suspense fallback={<SuspenseTracker name="AModeStats" />}>
        <AModeStats />
      </Suspense>
      <AModeShortcutGrid
        groups={groups}
        favourites={favourites}
        compact={IS_POPUP}
        collapsedGroupCount={IS_POPUP ? POPUP_VISIBLE_GROUPS : undefined}
      />
    </div>
  )
}
