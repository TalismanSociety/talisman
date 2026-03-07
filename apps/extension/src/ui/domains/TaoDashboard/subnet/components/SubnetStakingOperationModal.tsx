import { CodeBlock } from "@talisman/components/CodeBlock"
import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { shortenAddress } from "@talisman/util/shortenAddress"
import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { ArrowRightIcon, CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { cn, formatDecimals } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useCopyToClipboard } from "@ui/hooks/useCopyToClipboard"
import { Modal, Tooltip, TooltipContent, TooltipTrigger, WizardModalDialog } from "@ui/talisman-ui"
import { dump as convertToYaml } from "js-yaml"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSubnetTokens } from "../../hooks/useSubnetTokens"
import type { TransactionEntry } from "../../shared/types"
import { raoToTao } from "../../shared/util"
import {
  type MatchedCall,
  type StakingOperationType,
  useBittensorStakingOperation,
} from "./useBittensorStakingOperation"
import { useSubnetTransactions } from "./useSubnetTransactions"
import { useTransactionModal } from "./useTransactionModal"

/**
 * Despite is name, this component may display details of a transaction (made by the wallet) or a staking event (from indexer)
 * @param param0
 * @returns
 */
export const SubnetStakingOperationModal: FC<{
  netuid: number
}> = ({ netuid }) => {
  const { isOpen, args: transaction, close } = useTransactionModal()
  return (
    <Modal isOpen={isOpen && !!transaction} onDismiss={close}>
      <PopupSizeModalContainer id="tao-dashboard-transaction-modal">
        {transaction && <ModalContent netuid={netuid} transaction={transaction} onClose={close} />}
      </PopupSizeModalContainer>
    </Modal>
  )
}

const ModalContent: FC<{
  netuid: number
  transaction: TransactionEntry
  onClose: () => void
}> = ({ netuid, transaction, onClose }) => {
  const { t } = useTranslation()
  const { alphaToken } = useSubnetTokens(netuid)

  const { data: transactions } = useSubnetTransactions(netuid, false, 1000)
  const tx = useMemo(() => {
    return transactions.find((t) => t.hash === transaction.hash) ?? transaction
  }, [transactions, transaction])

  if (!transaction || !alphaToken) return null

  const isFailed = transaction.status === "failed"

  return (
    <WizardModalDialog
      title={t("Swap Details")}
      onCloseClick={onClose}
      className="size-full"
      contentClassName="flex flex-col size-full overflow-hidden pr-0"
    >
      <div className="scrollable scrollable-800 grow overflow-auto pr-8">
        <SwapSummary transaction={tx} netuid={netuid} />
        <div className="h-10 shrink-0"></div>

        <Field label={t("Status")}>
          <FieldValueStatus status={tx.status} />
        </Field>
        <Field label={t("Event")}>
          <FieldValueEventType direction={tx.direction} />
        </Field>
        <Field label={t("Account")}>
          <FieldValueAccount address={tx.account} />
        </Field>
        <Field label={t("Subnet")}>
          {netuid} - {alphaToken?.subnetName}
        </Field>
        <Field label={t("Validator")}>
          {tx.hotkey ? (
            <FieldValueValidator hotkey={tx.hotkey} />
          ) : isFailed ? (
            <FieldNA />
          ) : (
            <FieldSkeleton />
          )}
        </Field>

        <div className="flex h-14 w-full flex-col justify-center">
          <div className="h-px w-full bg-grey-700"></div>
        </div>
        <Field label={t("Block number")} className="text-body-secondary">
          {tx.blockHeight !== undefined ? (
            `#${tx.blockHeight.toLocaleString()}`
          ) : isFailed ? (
            <FieldNA />
          ) : (
            <FieldSkeleton />
          )}
        </Field>
        <Field label={t("Timestamp")} className="text-body-secondary">
          {tx.status === "indexed" ? (
            new Date(tx.timestamp).toLocaleString()
          ) : tx.timestamp ? (
            new Date(tx.timestamp).toLocaleString()
          ) : isFailed ? (
            <FieldNA />
          ) : (
            <FieldSkeleton />
          )}
        </Field>
        <Field label={t("Tx Hash")} className="text-body-secondary">
          <FieldValueTxHash hash={tx.hash} />
        </Field>
        <div className="flex h-14 w-full flex-col justify-center">
          <div className="h-px w-full bg-grey-700"></div>
        </div>
        <SlippageFields transaction={tx} netuid={netuid} alphaToken={alphaToken} />
      </div>
    </WizardModalDialog>
  )
}

const SwapSummary: FC<{ transaction: TransactionEntry; netuid: number }> = ({
  transaction,
  netuid,
}) => {
  const { t } = useTranslation()
  const { alphaTokenId } = useSubnetTokens(netuid)
  const isBuy = transaction.direction === "buy"
  const isUnknown = transaction.status !== "indexed" && transaction.status !== "failed"
  const sign = isBuy ? "+" : "-"
  const alphaValue = isBuy ? transaction.tokenValueOut : transaction.tokenValueIn

  return (
    <div className="flex flex-col items-center rounded bg-grey-850">
      <div className="items flex w-full flex-col items-center justify-center gap-2 p-6">
        <div
          className={cn("text-lg", isBuy ? "text-buy" : "text-sell", isUnknown && "animate-pulse")}
        >
          {sign} <TokensAndFiat noFiat noCountUp tokenId={alphaTokenId} planck={alphaValue} />
        </div>
      </div>
      <div className="h-px w-full shrink-0 bg-body-disabled/50"></div>
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 p-6">
        <div className="flex flex-col items-center gap-3 text-body-inactive">
          <div className="text-xs">{t("From")}</div>
          <div className="text-body text-sm">
            <TokensAndFiat
              noFiat
              noCountUp
              tokenId={transaction.tokenIdIn}
              planck={transaction.tokenValueIn}
            />
          </div>
        </div>
        <div className="text-body-inactive">
          <ArrowRightIcon className="size-10" />
        </div>
        <div className="flex flex-col items-center gap-3 text-body-inactive">
          <div className="text-xs">{t("To")}</div>
          <div className={cn("text-body text-sm", isUnknown && "animate-pulse")}>
            <TokensAndFiat
              noFiat
              noCountUp
              tokenId={transaction.tokenIdOut}
              planck={transaction.tokenValueOut}
            />
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
    <div className="flex h-12 w-full items-center justify-between gap-8 overflow-hidden text-sm">
      <div className="text-nowrap text-body-secondary">{label}</div>
      <div className={className}>{children}</div>
    </div>
  )
}

const FieldValueEventType: FC<{ direction: "buy" | "sell" }> = ({ direction }) => {
  const { t } = useTranslation()
  const label = direction === "buy" ? t("Add Stake") : t("Remove Stake")
  return <div className="text-body">{label}</div>
}

const FieldSkeleton: FC = () => <div className="h-7 w-32 animate-pulse rounded-xs bg-grey-800" />

const FieldError: FC = () => <div className="text-alert-error">Error</div>

const FieldHistoricalUnavailable: FC = () => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help text-body-secondary">{t("Unavailable")}</div>
      </TooltipTrigger>
      <TooltipContent>{t("Historical data not available for this transaction")}</TooltipContent>
    </Tooltip>
  )
}

const SlippageFields: FC<{
  transaction: TransactionEntry
  netuid: number
  alphaToken: SubDTaoToken
}> = ({ transaction, netuid, alphaToken }) => {
  const { t } = useTranslation()
  const isFailed = transaction.status === "failed"

  // Build params for useSlippage - works for any transaction with blockHeight and hotkey
  const slippageParams = useMemo(() => {
    // Need blockHeight and hotkey to compute slippage
    if (!transaction.blockHeight || !transaction.hotkey) return null
    // Don't compute for failed transactions
    if (transaction.status === "failed") return null
    return {
      hash: transaction.hash,
      blockHeight: transaction.blockHeight,
      netuid,
      hotkey: transaction.hotkey,
      direction: transaction.direction,
    }
  }, [transaction, netuid])

  const {
    data: slippage,
    isLoading: _isLoading,
    isError,
    error,
  } = useBittensorStakingOperation(slippageParams)

  // Check if the error is due to historical data being unavailable (non-archive node)
  const isHistoricalDataUnavailable = isError && error?.name === "HistoricalDataUnavailableError"

  // Format price (TAO per Alpha)
  const formatPrice = (price: bigint | number | null | undefined): string => {
    if (price === null || price === undefined) return ""
    const numPrice = typeof price === "bigint" ? raoToTao(price) : price
    return t("{{price}} τ / {{alphaSymbol}}", {
      price: formatDecimals(numPrice, 9),
      alphaSymbol: alphaToken.symbol,
    })
  }

  const formatSlippage = (percent: number | null | undefined): string => {
    if (percent === null || percent === undefined) return ""
    if (percent === 0) return "0%"
    const sign = percent > 0 ? "+" : ""
    return `${sign}${percent.toFixed(4)}%`
  }

  // Compute slippage from expected and effective prices
  // Slippage = (expected - effective) / expected * 100
  // Positive = got less than expected (bad), Negative = got more than expected (good)
  const slippagePercent = useMemo(() => {
    if (!slippage?.expectedPrice || !slippage?.effectivePrice) return undefined
    if (slippage.expectedPrice === 0n) return undefined
    // For price-based slippage: higher effective price means worse deal for buyer
    // Expected price = what user expected to pay per Alpha
    // Effective price = what user actually paid per Alpha
    // If effectivePrice > expectedPrice, user paid more (positive slippage = bad)
    return (
      (Number(slippage.effectivePrice - slippage.expectedPrice) / Number(slippage.expectedPrice)) *
      100
    )
  }, [slippage?.expectedPrice, slippage?.effectivePrice])

  const formatOperationType = (opType: StakingOperationType): string => {
    const labels: Record<StakingOperationType, string> = {
      unknown: t("Unknown"),
      stake: t("Stake"),
      stake_limit: t("Stake (with limit)"),
      unstake: t("Unstake"),
      unstake_limit: t("Unstake (with limit)"),
      unstake_all: t("Unstake All"),
      change_validator: t("Change Validator"),
      change_subnet: t("Change Subnet"),
      transfer: t("Transfer"),
    }
    return labels[opType] || opType
  }

  // Can we compute slippage for this transaction?
  const canComputeSlippage = !!transaction.blockHeight && !!transaction.hotkey

  return (
    <>
      <Field label={t("Operation type")}>
        {isHistoricalDataUnavailable ? (
          <FieldHistoricalUnavailable />
        ) : isError ? (
          <FieldError />
        ) : isFailed ? (
          <FieldNA />
        ) : !canComputeSlippage ? (
          <FieldNA />
        ) : slippage ? (
          <div className="text-body">{formatOperationType(slippage.operationType)}</div>
        ) : (
          <FieldSkeleton />
        )}
      </Field>
      <Field label={t("Expected price")}>
        {isHistoricalDataUnavailable ? (
          <FieldHistoricalUnavailable />
        ) : isError ? (
          <FieldError />
        ) : isFailed ? (
          <FieldNA />
        ) : !canComputeSlippage ? (
          <FieldNA />
        ) : slippage ? (
          slippage.expectedPrice ? (
            <div className="text-body">{formatPrice(slippage.expectedPrice)}</div>
          ) : (
            <FieldNA />
          )
        ) : (
          <FieldSkeleton />
        )}
      </Field>
      <Field label={t("Effective price")}>
        {isHistoricalDataUnavailable ? (
          <FieldHistoricalUnavailable />
        ) : isError ? (
          <FieldError />
        ) : isFailed ? (
          <FieldNA />
        ) : !canComputeSlippage ? (
          <FieldNA />
        ) : slippage?.effectivePrice ? (
          <div className="text-body">{formatPrice(slippage.effectivePrice)}</div>
        ) : (
          <FieldSkeleton />
        )}
      </Field>
      <Field label={t("Slippage")}>
        {isHistoricalDataUnavailable ? (
          <FieldHistoricalUnavailable />
        ) : isError ? (
          <FieldError />
        ) : isFailed ? (
          <FieldNA />
        ) : !canComputeSlippage ? (
          <FieldNA />
        ) : slippage ? (
          slippagePercent !== undefined ? (
            <div
              className={cn(
                "text-body",
                slippagePercent > 0 && "text-alert-error",
                slippagePercent < 0 && "text-green"
              )}
            >
              {formatSlippage(slippagePercent)}
            </div>
          ) : (
            <FieldNA />
          )
        ) : (
          <FieldSkeleton />
        )}
      </Field>
      {slippage?.matchedCall && <MatchedCallDisplay call={slippage.matchedCall} />}
    </>
  )
}

const FieldNA: FC = () => {
  const { t } = useTranslation()
  return <div className="text-body-secondary">{t("N/A")}</div>
}

/**
 * Serializes a value for display, handling special types like BigInt and PAPI Binary.
 * Recursively processes objects and arrays.
 */
const serializeForDisplay = (value: unknown): unknown => {
  // Handle null/undefined
  if (value === null || value === undefined) return value

  // Handle BigInt - convert to string with 'n' suffix for clarity
  if (typeof value === "bigint") return `${value.toString()}n`

  // Handle PAPI Binary (has asHex and asBytes methods)
  if (
    value &&
    typeof value === "object" &&
    "asHex" in value &&
    typeof (value as { asHex: unknown }).asHex === "function"
  ) {
    return (value as { asHex: () => string }).asHex()
  }

  // Handle Uint8Array / ArrayBuffer - convert to hex
  if (value instanceof Uint8Array) {
    return `0x${Array.from(value)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(serializeForDisplay)
  }

  // Handle plain objects
  if (typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = serializeForDisplay(val)
    }
    return result
  }

  // Primitives pass through
  return value
}

const MatchedCallDisplay: FC<{ call: MatchedCall }> = ({ call }) => {
  const { t } = useTranslation()
  const [displayAsJson, setDisplayAsJson] = useState(false)

  const code = useMemo(() => {
    const serialized = serializeForDisplay(call)
    if (displayAsJson) return JSON.stringify(serialized, null, 2)
    return convertToYaml(serialized)
  }, [call, displayAsJson])

  return (
    <div className="mt-4">
      <div className="mb-2 flex w-full items-center text-body-secondary text-sm">
        <div className="grow">{t("Individual call")}</div>
        <button
          type="button"
          onClick={() => setDisplayAsJson(false)}
          className={cn(
            "cursor-pointer",
            !displayAsJson ? "text-body" : "underline hover:text-grey-300"
          )}
        >
          YAML
        </button>{" "}
        /{" "}
        <button
          type="button"
          onClick={() => setDisplayAsJson(true)}
          className={cn(
            "cursor-pointer",
            displayAsJson ? "text-body" : "underline hover:text-grey-300"
          )}
        >
          JSON
        </button>
      </div>
      <CodeBlock className="max-h-80 overflow-auto" code={code} />
    </div>
  )
}

const FieldValueStatus: FC<{ status: TransactionEntry["status"] }> = ({ status }) => {
  const { t } = useTranslation()
  const statusConfig = {
    pending: { label: t("Pending"), className: "text-body-secondary" },
    finalizing: { label: t("Finalizing"), className: "text-body-secondary" },
    confirmed: { label: t("Finalized"), className: "text-body" },
    indexed: { label: t("Finalized"), className: "text-body" },
    failed: { label: t("Failed"), className: "text-alert-error" },
  }
  const config = statusConfig[status]
  return <div className={config.className}>{config.label}</div>
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
    <div className="flex max-w-full items-center gap-4 overflow-hidden">
      <AccountIcon address={hotkey} className="text-[1.5em]" />
      <BittensorValidatorName hotkey={hotkey} className="truncate text-body" />
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

  const blockExplorerUrl = `https://taostats.io/transaction/${hash}`

  return (
    <div className="flex items-center gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-body-secondary hover:text-body"
            onClick={() => copyToClipboard(hash)}
          >
            {shortenAddress(hash, 8, 8)}
          </button>
        </TooltipTrigger>
        <TooltipContent>{hash}</TooltipContent>
      </Tooltip>
      <a
        href={blockExplorerUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="text-body-secondary hover:text-body"
      >
        <ExternalLinkIcon className="size-8" />
      </a>
    </div>
  )
}
