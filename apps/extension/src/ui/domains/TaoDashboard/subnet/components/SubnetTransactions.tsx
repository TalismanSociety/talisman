import { DistanceToNow } from "@talisman/components/DistanceToNow"
import { BalanceFormatter } from "@talismn/balances"
import {
  type SubDTaoToken,
  type SubNativeToken,
  subDTaoTokenId,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { cn, formatDecimals } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useToken } from "@ui/state"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AccountNameOrAddress } from "../../shared/AccountNameOrAddress"
import { type TabConfig, TaoDashboardTabs } from "../../shared/TaoDashboardTabs"
import { TransactionAvatar } from "../../shared/TransactionAvatar"
import type { TransactionEntry } from "../../shared/types"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { SubnetStakingOperationModal } from "./SubnetStakingOperationModal"
import { useSubnetTransactions } from "./useSubnetTransactions"
import { useTransactionModal } from "./useTransactionModal"

type Tab = "my" | "all"

const MAX_ITEMS_PER_TAB = 20

export const SubnetTransactions: FC<{
  netuid: number
  className?: string
}> = ({ netuid, className }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>("my")

  const tabs = useMemo<TabConfig<Tab>[]>(
    () => [
      { value: "my", label: t("My Transactions") },
      { value: "all", label: t("All Transactions") },
    ],
    [t]
  )

  return (
    <div className={cn("flex size-full flex-col overflow-hidden bg-grey-850", className)}>
      <TaoDashboardTabs tabs={tabs} selected={activeTab} onSelect={setActiveTab} />
      <TransactionsList netuid={netuid} activeTab={activeTab} />
      <SubnetStakingOperationModal netuid={netuid} />
    </div>
  )
}

const useSubnetTokens = (netuid: number) => {
  const alphaTokenId = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, Number(netuid)), [netuid])
  const alphaToken = useToken(alphaTokenId, "substrate-dtao")

  const taoTokenId = useMemo(() => subNativeTokenId(BITTENSOR_NETWORK_ID), [])
  const taoToken = useToken(taoTokenId, "substrate-native")

  return { alphaToken, taoToken }
}

const TransactionsList: FC<{ netuid: number; activeTab: Tab }> = ({ netuid, activeTab }) => {
  const { t } = useTranslation()
  const refScrollContainer = useRef<HTMLDivElement>(null)
  const { data: transactions, isLoading } = useSubnetTransactions(
    netuid,
    activeTab === "my",
    MAX_ITEMS_PER_TAB
  )
  const { alphaToken, taoToken } = useSubnetTokens(netuid)

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to top if tab changes
  useEffect(() => {
    if (refScrollContainer.current) refScrollContainer.current.scrollTo({ top: 0 })
  }, [activeTab])

  if (!alphaToken || !taoToken) return null

  return (
    <div ref={refScrollContainer} className="flex grow flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center gap-8 px-12 pt-8 pb-4 text-sm">
        <span className="text-body-secondary">{t("Transactions on SN{{netuid}}", { netuid })}</span>
        {alphaToken?.subnetName && <span className="text-primary">{alphaToken.subnetName}</span>}
      </div>
      {isLoading ? (
        <div className="flex grow flex-col">
          {Array.from({ length: 10 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      ) : !transactions.length ? (
        <div className="flex grow items-center justify-center text-body-secondary">
          {activeTab === "my"
            ? t("No transactions from your accounts")
            : t("No recent transactions")}
        </div>
      ) : (
        <div className="flex grow flex-col">
          {transactions.map((tx, i) => (
            <TransactionRow
              key={`${tx.hash}-${i}`}
              alphaToken={alphaToken}
              taoToken={taoToken}
              transaction={tx}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const TransactionRow: FC<{
  taoToken: SubNativeToken
  alphaToken: SubDTaoToken
  transaction: TransactionEntry
}> = ({ taoToken, alphaToken, transaction }) => {
  const { t } = useTranslation()
  const { open } = useTransactionModal()

  const isBuy = transaction.direction === "buy"
  const isFailed = transaction.status === "failed"

  const taoDisplay = useMemo(() => {
    const taoValue = isBuy ? transaction.tokenValueIn : transaction.tokenValueOut
    const formatter = new BalanceFormatter(taoValue, taoToken.decimals)
    return `τ ${formatDecimals(formatter.tokens, 6)}`
  }, [isBuy, transaction.tokenValueIn, transaction.tokenValueOut, taoToken.decimals])

  const alphaValue = isBuy ? transaction.tokenValueOut : transaction.tokenValueIn

  const handleClick = useCallback(() => {
    open(transaction)
  }, [transaction, open])

  const statusLabel = useMemo(() => {
    switch (transaction.status) {
      case "pending":
        return t("Pending...")
      case "finalizing":
        return t("Finalizing...")
      case "failed":
        return t("Failed")
      case "confirmed":
      case "indexed":
        return <DistanceToNow timestamp={transaction.timestamp} />
    }
  }, [transaction, t])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex h-28 items-center justify-between pr-8 pl-12 text-left text-sm hover:bg-grey-800",
        transaction.status === "pending" && "animate-pulse"
      )}
    >
      <div className="flex items-center gap-8">
        <TransactionAvatar isBuy={isBuy} address={transaction.account} />
        <div className="flex flex-col gap-2">
          <div>
            <AccountNameOrAddress address={transaction.account} />
          </div>
          <div className={cn("text-xs", isFailed ? "text-alert-error" : "text-grey-500")}>
            {statusLabel}
          </div>
        </div>
      </div>
      <div className={cn("flex flex-col items-end gap-2", isFailed && "opacity-50")}>
        <div
          className={cn(
            isBuy && !isFailed && "text-primary",
            transaction.status !== "failed" &&
              transaction.status !== "indexed" &&
              transaction.direction === "buy" &&
              "animate-pulse"
          )}
        >
          {isBuy ? "+ " : "- "}
          <TokensAndFiat noFiat noCountUp tokenId={alphaToken.id} planck={alphaValue} />
        </div>
        <div
          className={cn(
            "text-grey-500 text-xs",
            transaction.status !== "failed" &&
              transaction.status !== "indexed" &&
              transaction.direction === "sell" &&
              "animate-pulse"
          )}
        >
          {taoDisplay}
        </div>
      </div>
    </button>
  )
}

const TransactionRowSkeleton: FC = () => {
  return (
    <div className="flex h-28 animate-pulse items-center justify-between pr-8 pl-12 text-sm">
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
