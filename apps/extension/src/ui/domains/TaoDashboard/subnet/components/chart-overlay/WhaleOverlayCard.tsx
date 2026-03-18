import { BalanceFormatter } from "@talismn/balances"
import { ExternalLinkIcon } from "@talismn/icons"
import type { TokenRates } from "@talismn/token-rates"
import { cn, formatDecimals } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import type { FC } from "react"
import { useMemo } from "react"

import type { WhaleTransaction } from "../../../hooks/useSn45Api"

const TAO_SYMBOL = "\u03C4" // τ

export const WhaleOverlayCard: FC<{
  tx: WhaleTransaction
  taoUsdPrice?: number
  taoDecimals: number
}> = ({ tx, taoUsdPrice, taoDecimals }) => {
  const isBuy = tx.transactionType === "StakeAdded"

  const { formatted, usdValue } = useMemo(() => {
    const formatter = new BalanceFormatter(
      BigInt(tx.taoAmount),
      taoDecimals,
      taoUsdPrice ? ({ usd: { price: taoUsdPrice } } as TokenRates) : undefined
    )
    return {
      formatted: formatDecimals(formatter.tokens, 4),
      usdValue: taoUsdPrice ? formatter.fiat("usd") : null,
    }
  }, [tx.taoAmount, taoDecimals, taoUsdPrice])

  const utcDate = new Date(tx.timestamp)
  const utcString = utcDate.toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Amount + link icon */}
      <div className="relative">
        <div
          className={cn(
            "font-semibold text-[20px] leading-[1.3]",
            isBuy ? "text-buy" : "text-sell"
          )}
        >
          {isBuy ? "+" : "-"}
          {formatted} {TAO_SYMBOL}
        </div>
        <div className="text-[#a5a5a5] text-[12px] leading-[1.3]">
          <FiatFromUsd amount={usdValue} noCountUp />
        </div>
        <ExternalLinkIcon className="absolute top-0 right-0 size-[15px] text-[#a5a5a5]" />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/20" />

      {/* Timestamp + address */}
      <div className="flex flex-col gap-[8px]">
        <div className="text-[#a5a5a5] text-[10px] leading-[1.2] opacity-60">{utcString} (UTC)</div>
        <div className="flex items-center gap-[8px]">
          <AccountIcon address={tx.coldkey} className="size-[12px] text-[12px]" />
          <Address
            className="text-[12px] text-white leading-[1.2]"
            startCharCount={6}
            endCharCount={6}
            address={tx.coldkey}
            noOnChainId
          />
        </div>
      </div>
    </div>
  )
}
