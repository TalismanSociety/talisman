import { cn } from "@talismn/util"
import type { FC } from "react"

import { useSubnetStakeEvents } from "../../hooks/useSn45Api"

interface SubnetTransactionsProps {
  netuid: number
  className?: string
}

const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

const formatTao = (amount: string) => {
  const num = parseFloat(amount) / 1e9
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(1)
}

const shortenAddress = (address: string) => {
  if (!address) return "—"
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const SubnetTransactions: FC<SubnetTransactionsProps> = ({ netuid, className }) => {
  const { data: events, isLoading } = useSubnetStakeEvents(netuid)

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-48 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className={cn("flex h-full items-center justify-center text-body-secondary", className)}>
        No recent transactions
      </div>
    )
  }

  // Sort by timestamp descending and take first 20
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {recentEvents.map((event, i) => {
        const isAdding = event.method === "Adding"
        return (
          <div
            key={`${event.timestamp}-${i}`}
            className={cn(
              "flex items-center justify-between rounded-lg border px-8 py-6",
              isAdding ? "border-green/30 bg-green/5" : "border-red-500/30 bg-red-500/5"
            )}
          >
            <div className="flex items-center gap-6">
              <div
                className={cn(
                  "flex size-24 items-center justify-center rounded-full text-white",
                  isAdding ? "bg-green" : "bg-red-500"
                )}
              >
                {isAdding ? "↑" : "↓"}
              </div>
              <div>
                <div className="text-body-secondary text-xs">
                  {event.coldkey ? shortenAddress(event.coldkey) : "Unknown"}
                </div>
                <div className="text-[10px] text-grey-600">{formatTimeAgo(event.timestamp)}</div>
              </div>
            </div>
            <div className={cn("font-bold", isAdding ? "text-green" : "text-red-500")}>
              {isAdding ? "+" : "-"}
              {formatTao(event.taoAmount)}τ
            </div>
          </div>
        )
      })}
    </div>
  )
}
