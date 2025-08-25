import { DefiPosition } from "extension-core"
import { uniq } from "lodash-es"
import { FC, useMemo } from "react"

export const PositionSymbol: FC<{ position: DefiPosition }> = ({ position }) => {
  return useMemo(() => {
    // by default show only the supplied tokens
    const lockedOnly = uniq(
      position.breakdown
        .filter((item) => ["staked", "deposit", "loan"].includes(item.type))
        .map((item) => item.symbol.trim()),
    ).join("/")

    if (lockedOnly) return lockedOnly

    // if empty, then join all found tokens
    return uniq(position.breakdown.map((item) => item.symbol.trim())).join("/")
  }, [position.breakdown])
}
