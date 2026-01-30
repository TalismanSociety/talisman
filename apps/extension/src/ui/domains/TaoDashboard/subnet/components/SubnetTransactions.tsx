import { DistanceToNow } from "@talisman/components/DistanceToNow"
import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { BalanceFormatter } from "@talismn/balances"
import {
  parseTokenId,
  type SubDTaoToken,
  type SubNativeToken,
  subDTaoTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "@talismn/icons"
import { cn, formatDecimals, type Prettify } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useCopyToClipboard } from "@ui/hooks/useCopyToClipboard"
import { useAccountByAddress, useAccounts, useToken, useTransactions } from "@ui/state"
import type { WalletTransactionDot, WalletTransactionInfo } from "extension-core"
import { type FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  Modal,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  WizardModalDialog,
} from "talisman-ui"
import { useSubnetStakeEvents } from "../../hooks/useSn45Api"
import { type TabConfig, TaoDashboardTabs } from "../../shared/TaoDashboardTabs"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { useTransactionModal } from "./useTransactionModal"

interface SubnetTransactionsProps {
  netuid: number
  className?: string
}

type Tab = "my" | "all"

export interface StakeEvent {
  hash: string
  method: "Adding" | "Removing"
  alphaAmount: string
  taoAmount: string
  timestamp: string
  coldkey: string
  hotkey: string
  blockHeight: number
}

type TransactionEntryBase = {
  hash: string
  account: string
  direction: "buy" | "sell"

  tokenIdIn: TokenId
  tokenIdOut: TokenId
  tokenValueIn: bigint
  tokenValueOut: bigint
}

type TransactionEntry = Prettify<
  TransactionEntryBase &
    (
      | {
          status: "pending"
          hotkey: string | undefined
        }
      | {
          status: "indexed"
          hotkey: string
          timestamp: string
          blockHeight: number
        }
    )
>

const MAX_ITEMS_PER_TAB = 20

export const SubnetTransactions: FC<SubnetTransactionsProps> = ({ netuid, className }) => {
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
      <TransactionModal netuid={netuid} />
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

const useSubnetTransactions = (netuid: number, ownedOnly: boolean, limit = 20) => {
  const accounts = useAccounts("owned")
  const { data: events, isLoading, error } = useSubnetStakeEvents(netuid)

  const relevantEvents = useMemo(() => {
    if (!ownedOnly) return events?.slice(0, limit) ?? []

    return (
      events
        ?.filter((event) => {
          const ownedAddresses = accounts.map((acc) => acc.address)
          return ownedAddresses.some((addr) => isAddressEqual(addr, event.coldkey))
        })
        .slice(0, limit) ?? []
    )
  }, [events, ownedOnly, accounts, limit])

  const indexedTransactions = useMemo<TransactionEntry[]>(() => {
    if (!relevantEvents) return []

    return relevantEvents.map((event) => {
      const isBuy = event.method === "Adding"

      return {
        hash: event.hash,
        account: event.coldkey,
        direction: isBuy ? "buy" : "sell",
        hotkey: event.hotkey,
        tokenIdIn: isBuy
          ? subNativeTokenId(BITTENSOR_NETWORK_ID)
          : subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid),
        tokenIdOut: isBuy
          ? subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)
          : subNativeTokenId(BITTENSOR_NETWORK_ID),
        tokenValueIn: BigInt(isBuy ? event.taoAmount : event.alphaAmount),
        tokenValueOut: BigInt(isBuy ? event.alphaAmount : event.taoAmount),
        status: "indexed" as const,
        timestamp: event.timestamp,
        blockHeight: event.blockHeight,
      }
    })
  }, [relevantEvents, netuid])

  const localTransactions = useTransactions()
  const localStakingTransactions = useMemo(() => {
    return localTransactions
      .filter((tx): tx is WalletTransactionDot => {
        if (tx.platform !== "polkadot" || tx.networkId !== BITTENSOR_NETWORK_ID) return false
        if (!tx.txInfo || tx.txInfo.type !== "bittensor-staking") return false
        return [tx.txInfo.fromTokenId, tx.txInfo.toTokenId]
          .map(parseTokenId)
          .some((parsed) => parsed.type === "substrate-dtao" && parsed.netuid === netuid)
      })
      .map((tx): TransactionEntry => {
        const txInfo = tx.txInfo as Extract<WalletTransactionInfo, { type: "bittensor-staking" }>
        const tokenIn = parseTokenId(txInfo.fromTokenId)
        const tokenOut = parseTokenId(txInfo.toTokenId)
        const isBuy = tokenIn.type === "substrate-native"
        const hotkey =
          tokenIn.type === "substrate-dtao"
            ? tokenIn.hotkey
            : tokenOut.type === "substrate-dtao"
              ? tokenOut.hotkey
              : undefined

        return {
          hash: tx.hash,
          account: tx.account,
          direction: isBuy ? "buy" : "sell",
          hotkey,
          tokenIdIn: txInfo.fromTokenId,
          tokenIdOut: txInfo.toTokenId,
          tokenValueIn: BigInt(txInfo.fromAmount),
          status: "pending", // assume local tx are overriden by indexed ones quite fast
          tokenValueOut: BigInt(txInfo.toAmount), // this is only an estimate
        }
      })
  }, [netuid, localTransactions])

  // consolidated list of 20 most recent transactions from on-chain and local
  const data = useMemo<TransactionEntry[]>(() => {
    // Create a map of indexed transactions by hash for deduplication
    const indexedByHash = new Map(indexedTransactions.map((tx) => [tx.hash, tx]))

    // Filter local transactions to only include those not yet indexed
    const pendingOnly = localStakingTransactions.filter((tx) => !indexedByHash.has(tx.hash))

    // Combine and sort by status (pending first) then by timestamp/recency
    const combined = [...pendingOnly, ...indexedTransactions]

    // Sort: pending transactions first, then by timestamp (newest first)
    combined.sort((a, b) => {
      // Pending transactions always come first
      if (a.status === "pending" && b.status !== "pending") return -1
      if (a.status !== "pending" && b.status === "pending") return 1

      // For indexed transactions, sort by timestamp (newest first)
      if (a.status === "indexed" && b.status === "indexed") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      }

      return 0
    })

    return combined.slice(0, limit)
  }, [indexedTransactions, localStakingTransactions, limit])

  return { data, isLoading, error }
}

const TransactionsList: FC<{ netuid: number; activeTab: Tab }> = ({ netuid, activeTab }) => {
  const { t } = useTranslation()
  const { data: transactions, isLoading } = useSubnetTransactions(
    netuid,
    activeTab === "my",
    MAX_ITEMS_PER_TAB
  )
  const { alphaToken, taoToken } = useSubnetTokens(netuid)

  if (!alphaToken || !taoToken) return null

  return (
    <div className="mr-4 grow overflow-y-auto pb-8">
      <div className="flex shrink-0 items-center gap-8 px-12 pt-8 pb-4 text-sm">
        <span className="text-body-secondary">{t("Transactions on SN{{netuid}}", { netuid })}</span>
        {alphaToken?.subnetName && <span className="text-primary">{alphaToken.subnetName}</span>}
      </div>
      {isLoading ? (
        <div className="flex flex-col">
          {Array.from({ length: 10 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      ) : !transactions.length ? (
        <div className="flex h-full items-center justify-center text-body-secondary">
          {activeTab === "my"
            ? t("No transactions from your accounts")
            : t("No recent transactions")}
        </div>
      ) : (
        <div className="flex flex-col">
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
  const taoDisplay = useMemo(() => {
    const taoValue =
      transaction.direction === "buy" ? transaction.tokenValueIn : transaction.tokenValueOut
    const formatter = new BalanceFormatter(taoValue, taoToken.decimals)
    return `τ ${formatDecimals(formatter.tokens, 6)}`
  }, [transaction, taoToken.decimals])

  const alphaValue =
    transaction.direction === "buy" ? transaction.tokenValueOut : transaction.tokenValueIn

  const isBuy = transaction.direction === "buy"
  const isPending = transaction.status === "pending"

  const { open } = useTransactionModal()
  const onClick = useCallback(() => {
    // Only open modal for indexed transactions (pending ones don't have full data)
    if (transaction.status === "indexed") {
      open({
        hash: transaction.hash,
        method: transaction.direction === "buy" ? "Adding" : "Removing",
        alphaAmount: alphaValue.toString(),
        taoAmount: (transaction.direction === "buy"
          ? transaction.tokenValueIn
          : transaction.tokenValueOut
        ).toString(),
        timestamp: transaction.timestamp,
        coldkey: transaction.account,
        hotkey: transaction.hotkey,
        blockHeight: transaction.blockHeight,
      })
    }
  }, [transaction, alphaValue, open])

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={cn(
        "flex h-28 items-center justify-between pr-8 pl-12 text-left text-sm",
        isPending ? "animate-pulse" : "hover:bg-grey-800"
      )}
    >
      <div className="flex items-center gap-8">
        <TransactionAvatar isBuy={isBuy} address={transaction.account} />
        <div className="flex flex-col gap-2">
          <div>
            <AccountNameOrAddress address={transaction.account} />
          </div>
          <div className={cn("text-grey-500 text-xs")}>
            {isPending ? t("Submitted") : <DistanceToNow timestamp={transaction.timestamp} />}
          </div>
        </div>
      </div>
      <div className={cn("flex flex-col items-end gap-2")}>
        <div className={cn(isBuy && "text-primary")}>
          {isBuy ? "+ " : "- "}
          <TokensAndFiat noFiat noCountUp tokenId={alphaToken.id} planck={alphaValue} />
        </div>
        <div className="text-grey-500 text-xs">{taoDisplay}</div>
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

const AccountNameOrAddress: FC<{ address: string }> = ({ address }) => {
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

const TransactionModal: FC<{ netuid: number }> = ({ netuid }) => {
  const { isOpen, args, close } = useTransactionModal()
  return (
    <Modal isOpen={isOpen && !!args} onDismiss={close}>
      <PopupSizeModalContainer id="tao-dashboard-transaction-modal">
        {args && <TransactionModalContent netuid={netuid} data={args} onClose={close} />}
      </PopupSizeModalContainer>
    </Modal>
  )
}

const TransactionModalContent: FC<{ netuid: number; data: StakeEvent; onClose: () => void }> = ({
  netuid,
  data,
  onClose,
}) => {
  const { t } = useTranslation()
  const { alphaToken } = useSubnetTokens(netuid)

  if (!data || !alphaToken) return null

  return (
    <WizardModalDialog
      title={t("Swap Details")}
      onCloseClick={onClose}
      className="size-full"
      contentClassName="flex flex-col size-full overflow-hidden"
    >
      <div className="scrollable scrollable-800 grow overflow-auto">
        <SwapSummary data={data} netuid={netuid} />
        <div className="h-10 shrink-0"></div>

        <Field label={t("Event")}>
          <FieldValueEventType method={data.method} />
        </Field>
        <Field label={t("Account")}>
          <FieldValueAccount address={data.coldkey} />
        </Field>
        <Field label={t("Subnet")}>
          {netuid} - {alphaToken?.subnetName}
        </Field>
        <Field label={t("Validator")}>
          <FieldValueValidator hotkey={data.hotkey} />
        </Field>
        <div className="flex h-14 w-full flex-col justify-center">
          <div className="h-px w-full bg-grey-700"></div>
        </div>
        <Field label={t("Block number")} className="text-body-secondary">
          #{data.blockHeight.toLocaleString()}
        </Field>
        <Field label={t("Timestamp")} className="text-body-secondary">
          {new Date(data.timestamp).toLocaleString()}
        </Field>
        <Field label={t("Tx Hash")} className="text-body-secondary">
          <FieldValueTxHash hash={data.hash} />
        </Field>
      </div>
      <Button
        icon={ExternalLinkIcon}
        onClick={() => {
          window.open(
            `https://taostats.io/transaction/${data.hash}`,
            "_blank",
            "noreferrer noopener"
          )
        }}
      >
        {t("View on Taostats")}
      </Button>
    </WizardModalDialog>
  )
}

const SwapSummary: FC<{ data: StakeEvent; netuid: number }> = ({ data, netuid }) => {
  const { t } = useTranslation()
  const sign = data.method === "Adding" ? "+" : "-"

  return (
    <div className="flex flex-col items-center rounded bg-grey-850">
      <div className="items flex w-full flex-col items-center justify-center gap-2 p-6">
        <div className={cn("text-lg", data.method === "Adding" ? "text-buy" : "text-sell")}>
          {sign}{" "}
          <TokensAndFiat
            noFiat
            noCountUp
            tokenId={subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)}
            planck={BigInt(data.alphaAmount)}
          />
        </div>
      </div>
      <div className="h-px w-full shrink-0 bg-body-disabled/50"></div>
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 p-6">
        <div className="flex flex-col items-center gap-3 text-body-inactive">
          <div className="text-xs">{t("From")}</div>
          <div className="text-body text-sm">
            {data.method === "Adding" ? (
              <TokensAndFiat
                noFiat
                noCountUp
                tokenId={subNativeTokenId(BITTENSOR_NETWORK_ID)}
                planck={BigInt(data.taoAmount)}
              />
            ) : (
              <TokensAndFiat
                noFiat
                noCountUp
                tokenId={subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)}
                planck={BigInt(data.alphaAmount)}
              />
            )}
          </div>
        </div>
        <div className="text-body-inactive">
          <ArrowRightIcon className="size-10" />
        </div>
        <div className="flex flex-col items-center gap-3 text-body-inactive">
          <div className="text-xs">{t("To")}</div>
          <div className="text-body text-sm">
            {data.method === "Adding" ? (
              <TokensAndFiat
                noFiat
                noCountUp
                tokenId={subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)}
                planck={BigInt(data.alphaAmount)}
              />
            ) : (
              <TokensAndFiat
                noFiat
                noCountUp
                tokenId={subNativeTokenId(BITTENSOR_NETWORK_ID)}
                planck={BigInt(data.taoAmount)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const Field: FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => {
  return (
    <div className="flex h-14 w-full items-center justify-between gap-8 overflow-hidden">
      <div className="text-nowrap text-body-secondary">{label}</div>
      <div className={className}>{children}</div>
    </div>
  )
}

const FieldValueEventType: FC<{ method: string }> = ({ method }) => {
  const { t } = useTranslation()

  const label = useMemo(() => {
    switch (method) {
      case "Adding":
        return t("Add Stake")
      case "Removing":
        return t("Remove Stake")
      default:
        return method
    }
  }, [method, t])

  return <div className="text-body">{label}</div>
}

const FieldValueAccount: FC<{ address: string }> = ({ address }) => {
  const copyToClipboard = useCopyToClipboard()

  return (
    <div className="flex items-center gap-4">
      <AccountDisplay address={address} />
      <button
        type="button"
        className="text-body-secondary hover:text-body"
        onClick={() => copyToClipboard(address)}
      >
        <CopyIcon className="size-8" />
      </button>
    </div>
  )
}

const FieldValueValidator: FC<{ hotkey: string }> = ({ hotkey }) => {
  const copyToClipboard = useCopyToClipboard()

  return (
    <div className="flex items-center gap-4">
      <AccountIcon address={hotkey} className="text-lg" />
      <BittensorValidatorName hotkey={hotkey} className="text-body" />
      <button
        type="button"
        className="text-body-secondary hover:text-body"
        onClick={() => copyToClipboard(hotkey)}
      >
        <CopyIcon className="size-8" />
      </button>
    </div>
  )
}

const FieldValueTxHash: FC<{ hash: string }> = ({ hash }) => {
  const copyToClipboard = useCopyToClipboard()

  return (
    <div className="flex items-center gap-4">
      <div className="text-body-secondary">{shortenAddress(hash, 8, 8)}</div>
      <button
        type="button"
        className="text-body-secondary hover:text-body"
        onClick={() => copyToClipboard(hash)}
      >
        <CopyIcon className="size-8" />
      </button>
    </div>
  )
}
