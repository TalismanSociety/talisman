import { Icon } from "@iconify/react/dist/iconify.js"
import { cn } from "@talismn/util"
import {
  useTaoPrice,
  useWhaleTransactions,
  type WhaleTransaction,
  type WhaleTransactionType,
} from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { type FC, useMemo } from "react"
import { formatNumber, formatTimeAgo } from "./shared"

export const TabWhaleActivity: FC<{ netuid: number }> = ({ netuid }) => (
  <WhaleActivitySection netuid={netuid} />
)

// ============================================================================
// Whale Activity Section
// ============================================================================

const formatUsd = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const truncateAddress = (address: string): string => {
  if (!address || address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Get display label for transaction type
const _getTransactionTypeLabel = (type: WhaleTransactionType): string => {
  switch (type) {
    case "StakeAdded":
      return "Stake Added"
    case "StakeRemoved":
      return "Stake Removed"
    case "StakeMove":
      return "Stake Move"
    case "StakeTransfer":
      return "Stake Transfer"
    case "StakeSwapped":
      return "Stake Swapped"
    default:
      return type
  }
}

// Get icon for transaction type
const getTransactionIcon = (type: WhaleTransactionType): string => {
  switch (type) {
    case "StakeAdded":
      return "mdi:arrow-down"
    case "StakeRemoved":
      return "mdi:arrow-up"
    case "StakeMove":
      return "mdi:swap-horizontal"
    case "StakeTransfer":
      return "mdi:send"
    case "StakeSwapped":
      return "mdi:swap-vertical"
    default:
      return "mdi:circle"
  }
}

// Get color for transaction type
const getTransactionColor = (type: WhaleTransactionType): string => {
  switch (type) {
    case "StakeAdded":
      return "bg-green"
    case "StakeRemoved":
      return "bg-red-500"
    case "StakeMove":
      return "bg-blue-500"
    case "StakeTransfer":
      return "bg-purple-500"
    case "StakeSwapped":
      return "bg-amber-500"
    default:
      return "bg-grey-600"
  }
}

// Get text color for transaction type
const getTransactionTextColor = (type: WhaleTransactionType): string => {
  switch (type) {
    case "StakeAdded":
      return "text-green"
    case "StakeRemoved":
      return "text-red-500"
    case "StakeMove":
      return "text-blue-500"
    case "StakeTransfer":
      return "text-purple-500"
    case "StakeSwapped":
      return "text-amber-500"
    default:
      return "text-body"
  }
}

// Is this an inflow transaction?
const isInflowTransaction = (type: WhaleTransactionType): boolean => {
  return type === "StakeAdded"
}

const WhaleActivitySection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: rawTransactions, isLoading } = useWhaleTransactions(netuid, { limit: 50 })
  const { data: taoPrice } = useTaoPrice()
  const transactions = useMemo(
    () =>
      (rawTransactions ?? []).filter(
        (tx: WhaleTransaction) =>
          tx.transactionType === "StakeAdded" || tx.transactionType === "StakeRemoved"
      ),
    [rawTransactions]
  )

  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0

  // Calculate flow totals
  const { inflow, outflow } = useMemo(() => {
    if (!transactions || transactions.length === 0) return { inflow: 0, outflow: 0 }

    let inflowTotal = 0
    let outflowTotal = 0

    for (const tx of transactions) {
      const taoAmount = Number(tx.taoAmount) / 1e9
      if (tx.transactionType === "StakeAdded") {
        inflowTotal += taoAmount
      } else if (tx.transactionType === "StakeRemoved") {
        outflowTotal += taoAmount
      }
    }

    return { inflow: inflowTotal, outflow: outflowTotal }
  }, [transactions])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-20 animate-pulse rounded-lg bg-grey-800" />
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-16 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="py-8 text-center text-body-secondary text-sm">
        No whale activity found for this subnet
      </div>
    )
  }

  const totalFlow = inflow + outflow
  const inflowPercent = totalFlow > 0 ? (inflow / totalFlow) * 100 : 50
  const outflowPercent = totalFlow > 0 ? (outflow / totalFlow) * 100 : 50

  return (
    <div className="flex flex-col gap-3">
      {/* Total Flow Header */}
      <div className="rounded-lg bg-grey-900 p-4">
        <div className="mb-3 font-medium text-white">Whale Flow</div>
        <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full">
          <div className="h-full bg-green transition-all" style={{ width: `${inflowPercent}%` }} />
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${outflowPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-body-secondary text-xs">
          <span className="text-green">{formatNumber(inflow, 0)} τ In</span>
          <span className="text-red-500">{formatNumber(outflow, 0)} τ Out</span>
        </div>
      </div>

      {/* Activity List */}
      {transactions.slice(0, 20).map((tx) => {
        const taoAmount = Number(tx.taoAmount) / 1e9
        const usdValue = taoAmount * taoUsdPrice
        const alphaAmount = tx.alphaAmount ? Number(tx.alphaAmount) / 1e9 : null
        const isInflow = isInflowTransaction(tx.transactionType)

        return (
          <div key={tx.id} className="rounded-xl bg-grey-900 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full",
                    getTransactionColor(tx.transactionType)
                  )}
                >
                  <Icon
                    icon={getTransactionIcon(tx.transactionType)}
                    className="size-5 text-white"
                  />
                </div>
                <div>
                  <div className="font-medium text-sm text-white">
                    {truncateAddress(tx.coldkey)}
                  </div>
                  <div className="text-body-secondary text-xs">{formatTimeAgo(tx.timestamp)}</div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={cn("font-medium text-sm", getTransactionTextColor(tx.transactionType))}
                >
                  {isInflow ? "+ " : "- "}
                  {formatNumber(taoAmount, 0)} τ
                </div>
                <div className="text-body-secondary text-xs">{formatUsd(usdValue)}</div>
              </div>
            </div>

            {/* Additional details for moves/transfers/swaps */}
            {(tx.originNetuid !== null || tx.destinationColdkey) && (
              <div className="mt-2 flex flex-wrap gap-2 border-grey-700 border-t pt-2 text-xs">
                {tx.originNetuid !== null && (
                  <span className="text-body-secondary">
                    From SN{tx.originNetuid} → SN{tx.netuid}
                  </span>
                )}
                {tx.destinationColdkey && (
                  <span className="text-body-secondary">
                    To: {truncateAddress(tx.destinationColdkey)}
                  </span>
                )}
                {alphaAmount !== null && (
                  <span className="text-body-secondary">{formatNumber(alphaAmount, 0)} α</span>
                )}
              </div>
            )}

            {/* Tier badge */}
            {/* <div className="mt-2">
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-xs",
                  tx.tier === "Whale"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : tx.tier === "Shark"
                      ? "bg-blue-500/20 text-blue-400"
                      : tx.tier === "Dolphin"
                        ? "bg-purple-500/20 text-purple-400"
                        : tx.tier === "Fish"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : tx.tier === "Crab"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-grey-600/20 text-grey-400"
                )}
              >
                {tx.tier}
              </span>
            </div> */}
          </div>
        )
      })}
    </div>
  )
}
