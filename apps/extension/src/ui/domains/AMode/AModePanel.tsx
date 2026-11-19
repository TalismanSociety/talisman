import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, type ReactNode, Suspense } from "react"

import { AModeFeatureCarousel } from "./AModeFeatureCarousel"
import { AModeMiniPanels } from "./AModeMiniPanels"
import { AModePrimaryActions } from "./AModePrimaryActions"
import { AModeQuickToggles } from "./AModeQuickToggles"
import { AModeShortcutGrid } from "./AModeShortcutGrid"
import { AModeStats } from "./AModeStats"
import { AModeTicker } from "./AModeTicker"
import { useAModeFavourites } from "./useAModeFavourites"
import { useAModeFeatureCards } from "./useAModeFeatureCards"
import { useAModeShortcuts } from "./useAModeShortcuts"

const POPUP_VISIBLE_GROUPS = 1

const Deferred: FC<{ name: string; children: ReactNode }> = ({ name, children }) => (
  <Suspense fallback={<SuspenseTracker name={name} />}>{children}</Suspense>
)

export const AModePanel: FC = () => {
  const { primary, groups, byId } = useAModeShortcuts()
  const favourites = useAModeFavourites(groups)
  const cards = useAModeFeatureCards(byId)

  const ticker = (
    <Deferred name="AModeTicker">
      <AModeTicker recoveryPhrases={byId["recovery-phrases"]} />
    </Deferred>
  )

  if (IS_POPUP)
    return (
      <div className="flex w-full flex-col gap-4" data-testid="a-mode-panel">
        {ticker}
        <AModePrimaryActions actions={primary} />
        <AModeQuickToggles />
        <AModeShortcutGrid
          groups={groups}
          favourites={favourites}
          compact
          collapsedGroupCount={POPUP_VISIBLE_GROUPS}
          more={
            <div className="flex flex-col gap-4">
              <AModeFeatureCarousel cards={cards} />
              <Deferred name="AModeStats">
                <AModeStats />
              </Deferred>
              <Deferred name="AModeMiniPanels">
                <AModeMiniPanels byId={byId} className="grid-cols-1" />
              </Deferred>
            </div>
          }
        />
      </div>
    )

  return (
    <div className="flex w-full flex-col gap-4" data-testid="a-mode-panel">
      {ticker}
      <AModePrimaryActions actions={primary} />
      <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-sm bg-grey-900 px-6 py-3">
        <AModeQuickToggles />
        <Deferred name="AModeStats">
          <AModeStats className="justify-end gap-8 border-grey-800 border-l bg-transparent py-0 pr-0 pl-8" />
        </Deferred>
      </div>
      <AModeFeatureCarousel cards={cards} />
      <Deferred name="AModeMiniPanels">
        <AModeMiniPanels byId={byId} className="grid-cols-3" />
      </Deferred>
      <AModeShortcutGrid groups={groups} favourites={favourites} compact={false} />
    </div>
  )
}
