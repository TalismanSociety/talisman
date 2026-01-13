import type { FC } from "react"

import type { SummaryDisplayMode } from "../../types"

export const SummaryLineBreak: FC<{ mode: SummaryDisplayMode }> = ({ mode }) => {
  return mode === "compact" ? null : <br />
}
