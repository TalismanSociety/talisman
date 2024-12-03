import { FC } from "react"

import { SummaryDisplayMode } from "../../types"

export const SummaryLineBreak: FC<{ mode: SummaryDisplayMode }> = ({ mode }) => {
  return mode === "compact" ? null : <br />
}
