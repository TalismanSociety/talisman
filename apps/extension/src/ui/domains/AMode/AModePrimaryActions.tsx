import type { FC } from "react"

import { AModeButton } from "./AModeButton"
import type { AModeShortcut } from "./types"

export const AModePrimaryActions: FC<{ actions: AModeShortcut[] }> = ({ actions }) => (
  <div className="grid grid-cols-4 gap-4" data-testid="a-mode-primary-actions">
    {actions.map((action) => (
      <AModeButton key={action.id} shortcut={action} variant="primary" />
    ))}
  </div>
)
