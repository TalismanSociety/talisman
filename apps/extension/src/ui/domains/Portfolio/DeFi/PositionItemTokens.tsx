import { DefiPositionItem } from "extension-core"
import { log } from "extension-shared"
import { FC, useMemo } from "react"
import { formatUnits } from "viem"

import { Tokens } from "@ui/domains/Asset/Tokens"

export const PositionItemTokens: FC<{ item: DefiPositionItem }> = ({ item }) => {
  const tokens = useMemo(() => {
    try {
      return formatUnits(BigInt(item.amount), item.decimals)
    } catch (err) {
      log.error("[DefiPositionItemTokens] Error formatting units", { item, err })
      return null
    }
  }, [item])

  return <Tokens amount={tokens} decimals={item.decimals} symbol={item.symbol} isBalance />
}
