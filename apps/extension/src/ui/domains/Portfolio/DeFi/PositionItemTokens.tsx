import type { DefiPositionItem } from "@core"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { log } from "extension-shared"
import { type FC, useMemo } from "react"
import { formatUnits } from "viem"

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
