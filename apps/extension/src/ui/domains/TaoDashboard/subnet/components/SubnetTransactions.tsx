import { subDTaoTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { useAccounts, useToken } from "@ui/state"
import { type FC, useMemo, useState } from "react"

import { useSubnetStakeEvents } from "../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

interface SubnetTransactionsProps {
  netuid: number
  className?: string
}

type Tab = "my" | "all"

const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffSecs < 60) return `${diffSecs}secs ago`
  if (diffMins < 60) return `${diffMins}mins ago`
  if (diffHours < 24) return `${diffHours}h ago`

  // For older transactions, show date with day prefix
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return `${diffDays}d ${dateStr},`
}

const formatAlpha = (amount: string) => {
  const num = parseFloat(amount) / 1e9
  return num.toFixed(3)
}

const formatTau = (amount: string) => {
  const num = parseFloat(amount) / 1e9
  return num.toFixed(6)
}

const shortenAddress = (address: string) => {
  if (!address) return "Unknown"
  return `${address.slice(0, 4)}...${address.slice(-3)}`
}

const TransactionAvatar: FC<{ isBuy: boolean; className?: string }> = ({ isBuy, className }) => (
  <div className={cn("relative shrink-0", className)}>
    <div
      className={cn(
        "flex size-20 items-center justify-center rounded-full",
        "bg-gradient-to-br from-orange-500 via-yellow-400 to-green-500"
      )}
    />
    <div
      className={cn(
        "absolute -right-2 -bottom-2 flex size-12 items-center justify-center rounded-full",
        "bg-black"
      )}
    >
      {isBuy ? (
        <ArrowDownIcon className="size-10 text-green" />
      ) : (
        <ArrowUpIcon className="size-10 text-red-500" />
      )}
    </div>
  </div>
)

export const SubnetTransactions: FC<SubnetTransactionsProps> = ({ netuid, className }) => {
  const [activeTab, setActiveTab] = useState<Tab>("my")
  const { data: events, isLoading } = useSubnetStakeEvents(netuid)
  const ownedAccounts = useAccounts("owned")

  const tokenId = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, Number(netuid)), [netuid])
  const token = useToken(tokenId, "substrate-dtao")

  const filteredEvents = useMemo(() => {
    if (!events) return []

    const sorted = [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    if (activeTab === "my") {
      return sorted
        .filter(
          (event) =>
            event.coldkey &&
            ownedAccounts.some((account) => isAddressEqual(account.address, event.coldkey!))
        )
        .slice(0, 20)
    }

    return sorted.slice(0, 20)
  }, [events, activeTab, ownedAccounts])

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Tabs */}
      <div className="flex shrink-0 border-grey-750 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("my")}
          className={cn(
            "flex-1 px-4 py-3 text-center font-medium text-sm transition-colors",
            activeTab === "my"
              ? "border-white border-b-2 text-white"
              : "text-body-secondary hover:text-white"
          )}
        >
          My Transactions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 px-4 py-3 text-center font-medium text-sm transition-colors",
            activeTab === "all"
              ? "border-white border-b-2 text-white"
              : "text-body-secondary hover:text-white"
          )}
        >
          All Transactions
        </button>
      </div>

      {/* Subnet Header */}
      <div className="flex shrink-0 items-center gap-8 px-12 py-8">
        <span className="text-body-secondary text-sm">Transactions on SN{netuid}</span>
        {token?.subnetName && (
          <span className="rounded bg-primary/20 px-6 py-2 font-medium text-primary text-xs">
            {token.subnetName}
          </span>
        )}
        {/* {token?.logo && (
          <img src={token.logo} alt="" className="size-24 rounded-full object-cover" />
        )} */}
      </div>

      {/* Transaction List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-12">
        {isLoading ? (
          <div className="flex flex-col gap-8">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              <div key={i} className="h-48 animate-pulse rounded-lg bg-grey-800" />
            ))}
          </div>
        ) : !filteredEvents.length ? (
          <div className="flex h-full items-center justify-center text-body-secondary">
            {activeTab === "my" ? "No transactions from your accounts" : "No recent transactions"}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {filteredEvents.map((event, i) => {
              const isBuy = event.method === "Adding"
              return (
                <div key={`${event.timestamp}-${i}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <TransactionAvatar isBuy={isBuy} />
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "font-semibold text-xs",
                          isBuy ? "text-green" : "text-red-500"
                        )}
                      >
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <span className="text-grey-500 text-xs">
                        {formatTimeAgo(event.timestamp)}{" "}
                        {event.coldkey ? shortenAddress(event.coldkey) : "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cn("font-semibold", isBuy ? "text-green" : "text-red-500")}>
                      {isBuy ? "+" : "- "}
                      {formatAlpha(event.alphaAmount)} α
                    </span>
                    <span className="text-grey-500 text-xs">τ {formatTau(event.taoAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
