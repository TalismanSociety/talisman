import { DistanceToNow } from "@talisman/components/DistanceToNow"
import { BalanceFormatter } from "@talismn/balances"
import {
  type SubDTaoToken,
  type SubNativeToken,
  subDTaoTokenId,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { cn, formatDecimals } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useAccountByAddress, useAccounts, useToken } from "@ui/state"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { useSubnetStakeEvents } from "../../hooks/useSn45Api"
import { type TabConfig, TaoDashboardTabs } from "../../shared/TaoDashboardTabs"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

interface SubnetTransactionsProps {
  netuid: number
  className?: string
}

type Tab = "my" | "all"

interface StakeEvent {
  hash: string
  method: "Adding" | "Removing"
  alphaAmount: string
  taoAmount: string
  timestamp: string
  coldkey?: string
}

const MAX_ITEMS_PER_TAB = 20

export const SubnetTransactions: FC<SubnetTransactionsProps> = ({ netuid, className }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>("my")
  const { data: events, isLoading } = useSubnetStakeEvents(netuid)
  const ownedAccounts = useAccounts("owned")

  const alphaTokenId = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, Number(netuid)), [netuid])
  const alphaToken = useToken(alphaTokenId, "substrate-dtao")

  const taoTokenId = useMemo(() => subNativeTokenId(BITTENSOR_NETWORK_ID), [])
  const taoToken = useToken(taoTokenId, "substrate-native")

  const tabs = useMemo<TabConfig<Tab>[]>(
    () => [
      { value: "my", label: t("My Transactions") },
      { value: "all", label: t("All Transactions") },
    ],
    [t]
  )

  const filteredEvents = useMemo(() => {
    if (!events) return []

    const sorted = [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    if (activeTab === "my") {
      const matches: StakeEvent[] = []

      // Iterate once over the sorted events and stop when we've collected 20 matches (there are usually 5000 entries)
      for (const event of sorted) {
        if (!event.coldkey) continue

        const isOwned = ownedAccounts.some((account) =>
          isAddressEqual(account.address, event.coldkey!)
        )

        if (isOwned) {
          matches.push(event)
          if (matches.length >= MAX_ITEMS_PER_TAB) break
        }
      }

      return matches
    }

    return sorted.slice(0, MAX_ITEMS_PER_TAB)
  }, [events, activeTab, ownedAccounts])

  if (!alphaToken || !taoToken) return null

  return (
    <div className={cn("flex size-full flex-col overflow-hidden bg-grey-850", className)}>
      {/* Tabs */}
      <TaoDashboardTabs tabs={tabs} selected={activeTab} onSelect={setActiveTab} />
      {/* Subnet Header */}

      {/* Transaction List */}
      <div className="mr-4 grow overflow-y-auto px-12 pr-8 pb-8">
        <div className="flex shrink-0 items-center gap-8 py-8 text-sm">
          <span className="text-body-secondary">
            {t("Transactions on SN{{netuid}}", { netuid })}
          </span>
          {alphaToken?.subnetName && <span className="text-primary">{alphaToken.subnetName}</span>}
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-8">
            {Array.from({ length: 10 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
        ) : !filteredEvents.length ? (
          <div className="flex h-full items-center justify-center text-body-secondary">
            {activeTab === "my"
              ? t("No transactions from your accounts")
              : t("No recent transactions")}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {filteredEvents.map((event, i) => (
              <TransactionRow
                key={`${event.timestamp}-${i}`}
                alphaToken={alphaToken}
                taoToken={taoToken}
                event={event}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const TransactionRow: FC<{
  taoToken: SubNativeToken
  alphaToken: SubDTaoToken
  event: StakeEvent
}> = ({ taoToken, alphaToken, event }) => {
  const taoDisplay = useMemo(() => {
    const formatter = new BalanceFormatter(event.taoAmount, taoToken.decimals)
    return `τ ${formatDecimals(formatter.tokens, 6)}`
  }, [event.taoAmount, taoToken.decimals])

  const isBuy = event.method === "Adding"

  return (
    <div className="flex h-20 items-center justify-between text-sm">
      <div className="flex items-center gap-8">
        <TransactionAvatar isBuy={isBuy} address={event.coldkey ?? ""} />
        <div className="flex flex-col gap-2">
          <div>
            <AccountDisplay address={event.coldkey ?? ""} />
          </div>
          <div className="text-grey-500 text-xs">
            <DistanceToNow timestamp={event.timestamp} />{" "}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className={cn(isBuy && "text-primary")}>
          {isBuy ? "+" : "-"}
          <TokensAndFiat
            noFiat
            noCountUp
            tokenId={alphaToken.id}
            planck={BigInt(event.alphaAmount)}
          />
        </div>
        <div className="text-grey-500 text-xs">{taoDisplay}</div>
      </div>
    </div>
  )
}

const TransactionRowSkeleton: FC = () => {
  return (
    <div className="flex h-20 animate-pulse items-center justify-between text-sm">
      <div className="flex items-center gap-8">
        <div className="size-[3.6rem] rounded-full bg-grey-800"></div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="h-7 w-48 rounded-xs bg-grey-800"></div>
          </div>
          <div className="text-grey-500 text-xs">
            <div className="h-6 w-32 rounded-xs bg-grey-800"></div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <div>
          <div className="h-7 w-32 rounded-xs bg-grey-800"></div>
        </div>
        <div className="text-grey-500 text-xs">
          <div className="h-6 w-48 rounded-xs bg-grey-800"></div>
        </div>
      </div>
    </div>
  )
}

const AccountDisplay: FC<{ address: string }> = ({ address }) => {
  const account = useAccountByAddress(address)

  if (account) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{account.name}</span>
        </TooltipTrigger>
        <TooltipContent>{account.address}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Address
      className="text-body-secondary"
      startCharCount={6}
      endCharCount={6}
      address={address}
      noOnChainId
    />
  )
}

const TransactionAvatar: FC<{ isBuy: boolean; address: string; className?: string }> = ({
  isBuy,
  address,
  className,
}) => (
  <div className={cn("relative shrink-0", className)}>
    <AccountIcon address={address} className="size-[3.6rem] text-[3.6rem]" />
    <div className="absolute -right-2 -bottom-2 flex size-10 items-center justify-center rounded-full bg-grey-850 p-px">
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center rounded-full",
          isBuy ? "bg-buy/15" : "bg-sell/15"
        )}
      >
        {isBuy ? (
          <ArrowDownIcon className="size-7 rounded-full text-green" />
        ) : (
          <ArrowUpIcon className="size-7 rounded-full text-sell" />
        )}
      </div>
    </div>
  </div>
)
