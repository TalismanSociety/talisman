import { DistanceToNow } from "@talisman/components/DistanceToNow"
import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { BalanceFormatter } from "@talismn/balances"
import {
  type SubDTaoToken,
  type SubNativeToken,
  subDTaoTokenId,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "@talismn/icons"
import { cn, formatDecimals } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useCopyToClipboard } from "@ui/hooks/useCopyToClipboard"
import { useAccountByAddress, useAccounts, useToken } from "@ui/state"
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

const TransactionsList: FC<{ netuid: number; activeTab: Tab }> = ({ netuid, activeTab }) => {
  const { t } = useTranslation()
  const { data: events, isLoading } = useSubnetStakeEvents(netuid)
  const ownedAccounts = useAccounts("owned")

  const { alphaToken, taoToken } = useSubnetTokens(netuid)

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
      ) : !filteredEvents.length ? (
        <div className="flex h-full items-center justify-center text-body-secondary">
          {activeTab === "my"
            ? t("No transactions from your accounts")
            : t("No recent transactions")}
        </div>
      ) : (
        <div className="flex flex-col">
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

  const { open } = useTransactionModal()
  const onClick = useCallback(() => {
    open(event)
  }, [event, open])

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-28 items-center justify-between pr-8 pl-12 text-left text-sm hover:bg-grey-800"
    >
      <div className="flex items-center gap-8">
        <TransactionAvatar isBuy={isBuy} address={event.coldkey ?? ""} />
        <div className="flex flex-col gap-2">
          <div>
            <AccountNameOrAddress address={event.coldkey ?? ""} />
          </div>
          <div className="text-grey-500 text-xs">
            <DistanceToNow timestamp={event.timestamp} />{" "}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className={cn(isBuy && "text-primary")}>
          {isBuy ? "+ " : "- "}
          <TokensAndFiat
            noFiat
            noCountUp
            tokenId={alphaToken.id}
            planck={BigInt(event.alphaAmount)}
          />
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
    <Modal isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="tao-dashboard-transaction-modal">
        <TransactionModalContent netuid={netuid} data={args!} onClose={close} />
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
          <div className="text-xs">From</div>
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
          <div className="text-xs">To</div>
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
