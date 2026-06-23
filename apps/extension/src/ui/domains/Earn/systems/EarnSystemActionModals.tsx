import type { FC } from "react"

import { EARN_SYSTEMS } from "./registry"

// Mounts every registered system's global action-modal singleton. Rendered once per app shell, so a
// new system with an ActionModal needs no shell edit to appear.
export const EarnSystemActionModals: FC = () => (
  <>
    {EARN_SYSTEMS.map((system) =>
      system.ActionModal ? <system.ActionModal key={system.id} /> : null
    )}
  </>
)
