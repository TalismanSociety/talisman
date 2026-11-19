import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, Suspense } from "react"

import { AModePrimaryActions } from "./AModePrimaryActions"
import { AModeShortcutGrid } from "./AModeShortcutGrid"
import { AModeStats } from "./AModeStats"
import { useAModeShortcuts } from "./useAModeShortcuts"

export const AModePanel: FC = () => {
  const { primary, groups } = useAModeShortcuts()

  return (
    <div className="flex w-full flex-col gap-4" data-testid="a-mode-panel">
      <AModePrimaryActions actions={primary} />
      <Suspense fallback={<SuspenseTracker name="AModeStats" />}>
        <AModeStats />
      </Suspense>
      <AModeShortcutGrid groups={groups} compact={IS_POPUP} />
    </div>
  )
}
