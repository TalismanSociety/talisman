import { BalanceFormatter } from "@talismn/balances"
import type { SubDTaoToken, SubNativeToken } from "@talismn/chaindata-provider"
import type { TokenRates } from "@talismn/token-rates"
import { cn } from "@talismn/util"
import { DistanceToNow } from "@ui/components/DistanceToNow"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import {
  useSubnetWhalesActivity,
  useSubnetWhalesFlow,
  useTaoPrice,
  type WhaleTransaction,
  type WhaleTransactionType,
} from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { AccountNameOrAddress } from "@ui/domains/TaoDashboard/shared/AccountNameOrAddress"
import { TAO_SYMBOL } from "@ui/domains/TaoDashboard/shared/constants"
import { TextSkeleton as Skeleton } from "@ui/domains/TaoDashboard/shared/Skeleton"
import { TransactionAvatar } from "@ui/domains/TaoDashboard/shared/TransactionAvatar"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { type FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSetChartOverlay } from "../chart-overlay/ChartOverlayContext"
import { SectionTitleBar } from "./SectionTitleBar"

export const TabWhalesActivity: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1w")

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <SectionTitleBar label={t("Whale Activity")} period={period} onPeriodChange={setPeriod} />

      <div className="flex w-full grow flex-col overflow-hidden rounded-lg bg-grey-900">
        <WhalesActivitySummary netuid={netuid} period={period} />
        <Separator />
        <WhalesActivityList netuid={netuid} period={period} />
      </div>
    </div>
  )
}

const Separator = () => <div className="h-px shrink-0 bg-grey-800"></div>

// ============================================================================
// Whale Activity Section
// ============================================================================

// Is this an inflow transaction?
const isInflowTransaction = (type: WhaleTransactionType): boolean => {
  return type === "StakeAdded"
}

const WhalesActivitySummary: FC<{ netuid: number; period: TimePeriod }> = ({ netuid, period }) => {
  const { t } = useTranslation()
  const { taoTokenId } = useSubnetTokens(netuid)
  const { data, isLoading, isError } = useSubnetWhalesFlow(netuid, period)

  const inflowPercent = useMemo(() => {
    if (!data) return null
    const total = BigInt(data.total ?? 0n)
    if (total === 0n) return null

    const inflow = BigInt(data.inflow ?? 0n)
    return Number((inflow * 100n) / total)
  }, [data])

  const hasActivity = !!data && data.total !== "0"

  if (isLoading)
    return (
      <div className="flex h-27.5 w-full shrink-0 flex-col justify-center px-12">
        <div>
          <Skeleton className="mb-3 h-8 w-48 font-medium text-white" />
        </div>
        <Skeleton className="mt-10 mb-5 flex h-2 w-full overflow-hidden rounded-full bg-grey-800"></Skeleton>
        <div className={cn("flex justify-between text-body-secondary text-xs")}>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    )

  if (isError)
    return (
      <div className="flex h-27.5 w-full shrink-0 flex-col justify-center px-12">
        <div className="text-center text-body-secondary">{t("Failed to fetch data")}</div>
      </div>
    )

  return (
    <div className="flex h-27.5 w-full shrink-0 flex-col justify-center px-12">
      <div className="mb-3 font-medium text-white">{t("Whale Trade Flow")}</div>
      {inflowPercent !== null ? (
        <div className="mt-10 mb-5 flex h-2 w-full overflow-hidden rounded-full">
          <div className="h-full grow bg-red-500 transition-all" />
          <div className="h-full bg-green transition-all" style={{ width: `${inflowPercent}%` }} />
        </div>
      ) : (
        <div className="mt-10 mb-5 flex h-2 w-full overflow-hidden rounded-full bg-grey-800"></div>
      )}
      <div
        className={cn(
          "flex justify-between text-body-secondary text-xs",
          !data?.total && "invisible"
        )}
      >
        <span className={hasActivity ? "text-red-500" : "text-body-inactive"}>
          <TokensAndFiat planck={data?.outflow} tokenId={taoTokenId} noFiat noSymbol noCountUp /> τ
        </span>
        <span className={hasActivity ? "text-green" : "text-body-inactive"}>
          <TokensAndFiat planck={data?.inflow} tokenId={taoTokenId} noFiat noSymbol noCountUp /> τ
        </span>
      </div>
    </div>
  )
}

type WhalesActivityData = ReturnType<typeof useSubnetWhalesActivity>["data"]
type WhalesActivityEntry = NonNullable<WhalesActivityData>[number]

const WhalesActivityList: FC<{ netuid: number; period: TimePeriod }> = ({ netuid, period }) => {
  const { t } = useTranslation()
  const { data: rawTransactions, isLoading } = useSubnetWhalesActivity(netuid, period)
  const { data: taoPrice } = useTaoPrice()
  const transactions = useMemo(
    () =>
      (rawTransactions ?? []).filter(
        (tx: WhaleTransaction) =>
          tx.transactionType === "StakeAdded" || tx.transactionType === "StakeRemoved"
      ),
    [rawTransactions]
  )

  const taoUsdPrice = useMemo(() => {
    if (!taoPrice?.price) return undefined
    return parseFloat(taoPrice.price)
  }, [taoPrice])

  const { alphaToken, taoToken } = useSubnetTokens(netuid)

  const tokensLoaded = !!taoToken && !!alphaToken

  if (!isLoading && !tokensLoaded) return null

  if (!isLoading && tokensLoaded && (!transactions || transactions.length === 0)) {
    return (
      <div className="py-8 text-center text-body-secondary text-sm">
        {t("No whale activity found for this subnet")}
      </div>
    )
  }

  return (
    <div className="flex grow flex-col overflow-y-auto">
      {isLoading || !tokensLoaded
        ? // biome-ignore lint/suspicious/noArrayIndexKey: static list
          Array.from({ length: 5 }).map((_, i) => <WhaleActivityItemSkeleton key={i} />)
        : transactions.map((tx) => (
            <WhaleActivityItem
              key={tx.id}
              tx={tx}
              alphaToken={alphaToken}
              taoToken={taoToken}
              taoUsdPrice={taoUsdPrice}
            />
          ))}
    </div>
  )
}

const WhaleActivityItem: FC<{
  tx: WhalesActivityEntry
  alphaToken: SubDTaoToken
  taoToken: SubNativeToken
  taoUsdPrice?: number
}> = ({ tx, taoToken, taoUsdPrice }) => {
  const isBuy = isInflowTransaction(tx.transactionType)
  const setHoveredItem = useSetChartOverlay()

  const usdValue = useMemo(() => {
    if (!taoUsdPrice) return null
    const formatter = new BalanceFormatter(BigInt(tx.taoAmount), taoToken.decimals, {
      "usd": { price: taoUsdPrice },
    } as TokenRates)
    return formatter.fiat("usd")
  }, [taoUsdPrice, taoToken.decimals, tx.taoAmount])

  const handleClick = useCallback(() => {
    const extrinsicIndex = String(tx.extrinsicIndex).padStart(4, "0")
    window.open(
      `https://taostats.io/extrinsic/${tx.blockHeight}-${extrinsicIndex}`,
      "_blank",
      "noopener,noreferrer"
    )
  }, [tx])

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() =>
        setHoveredItem({
          type: "whale",
          timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
          tx,
          taoUsdPrice,
          taoDecimals: taoToken.decimals,
        })
      }
      onMouseLeave={() => setHoveredItem(null)}
      className={cn(
        "flex h-28 shrink-0 items-center justify-between px-12 text-left text-sm hover:bg-grey-800"
      )}
    >
      <div className="flex items-center gap-8">
        <TransactionAvatar isBuy={isBuy} address={tx.coldkey} />
        <div className="flex flex-col gap-2">
          <div>
            <AccountNameOrAddress address={tx.coldkey} />
          </div>
          <div className={cn("text-grey-500 text-xs")}>
            <DistanceToNow timestamp={tx.timestamp} />
          </div>
        </div>
      </div>
      <div className={cn("flex flex-col items-end gap-2")}>
        <div className={cn(isBuy ? "text-buy" : "text-sell")}>
          {isBuy ? "+ " : "- "}
          <TokensAndFiat
            noFiat
            noCountUp
            tokenId={taoToken.id}
            planck={BigInt(tx.taoAmount)}
            noSymbol
          />{" "}
          {TAO_SYMBOL}
        </div>
        <div className={cn("text-grey-500 text-xs")}>
          <FiatFromUsd amount={usdValue} noCountUp />
        </div>
      </div>
    </button>
  )
}

const WhaleActivityItemSkeleton = () => {
  return (
    <div className="flex h-28 shrink-0 items-center justify-between px-12 text-left text-sm">
      <div className="flex items-center gap-8">
        <div className="relative shrink-0">
          <Skeleton className="size-[2.25rem] rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-36" />
      </div>
    </div>
  )
}
