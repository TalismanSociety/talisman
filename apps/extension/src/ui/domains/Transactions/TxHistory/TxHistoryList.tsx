import { HexString } from "@polkadot/util/types"
import { BalanceFormatter } from "@talismn/balances"
import { getBlockExplorerLabel, getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import {
  ArrowRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  LoaderIcon,
  TrashIcon,
  XOctagonIcon,
} from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { formatDistanceToNowStrict, Locale } from "date-fns"
import {
  db,
  isTxInfoApproval,
  isTxInfoSwap,
  isTxInfoTransfer,
  TransactionStatus,
  WalletTransaction,
  WalletTransactionDot,
  WalletTransactionEth,
  WalletTransactionSol,
} from "extension-core"
import { IS_FIREFOX } from "extension-shared"
import i18next from "i18next"
import { FC, ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Modal, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useScrollContainer } from "@talisman/components/ScrollContainer"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useSwapStatus } from "@ui/domains/Swap/hooks/useSwapStatus"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import {
  useAnyNetwork,
  useNetworkByGenesisHash,
  useNetworkById,
  useSelectedCurrency,
  useToken,
  useTokenRates,
} from "@ui/state"
import { IS_EMBEDDED_POPUP, IS_POPUP } from "@ui/util/constants"

import { TxProgress } from "../TxProgress"
import { useTxHistory } from "./TxHistoryContext"

const getExplorerTargetId = (tx: WalletTransaction) =>
  tx.platform === "solana" ? tx.signature : tx.hash

type ReplacementCallbackArgs = { txId: HexString; networkId: string }

export const TxHistoryList = () => {
  const { isLoading, transactions } = useTxHistory()
  const { t } = useTranslation()

  const [selectedTxId, setSelectedTxId] = useState<string>()
  const [dismissingTxIds, setDismissingTxIds] = useState<Set<string>>(() => new Set())

  const selectedTx = useMemo(
    () => transactions.find((tx) => tx.id === selectedTxId),
    [selectedTxId, transactions],
  )

  const handleSelectTx = useCallback((tx: WalletTransaction) => {
    setSelectedTxId(tx.id)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedTxId(undefined)
  }, [])

  const handleDismissTx = useCallback(async (tx: WalletTransaction) => {
    setDismissingTxIds((prev) => {
      const next = new Set(prev)
      next.add(tx.id)
      return next
    })

    try {
      await db.transactionsV2.delete(tx.id)
    } catch (error) {
      setDismissingTxIds((prev) => {
        const next = new Set(prev)
        next.delete(tx.id)
        return next
      })
    }
  }, [])

  const handleReplacementComplete = useCallback(({ txId }: ReplacementCallbackArgs) => {
    setSelectedTxId(txId)
  }, [])

  useEffect(() => {
    if (!selectedTxId) return
    if (!transactions.some((tx) => tx.id === selectedTxId)) {
      setSelectedTxId(undefined)
    }
  }, [selectedTxId, transactions])

  useEffect(() => {
    setDismissingTxIds((prev) => {
      let mutated = false
      const next = new Set(prev)
      prev.forEach((id) => {
        if (transactions.some((tx) => tx.id === id)) return
        next.delete(id)
        mutated = true
      })

      return mutated ? next : prev
    })
  }, [transactions])

  const isModalDismissing = selectedTx ? dismissingTxIds.has(selectedTx.id) : false

  return (
    <div className="pb-4">
      <TransactionRows
        transactions={transactions}
        dismissingTxIds={dismissingTxIds}
        onSelectTx={handleSelectTx}
      />

      {!isLoading && !transactions.length && (
        <div className="text-body-disabled bg-grey-900 flex h-40 w-full flex-col items-center justify-center rounded-sm text-sm">
          {t("No transactions found")}
        </div>
      )}
      {isLoading && <TransactionRowShimmer />}

      <TxHistoryModal
        tx={selectedTx}
        isOpen={!!selectedTxId}
        onClose={handleCloseModal}
        onDismiss={handleDismissTx}
        isDismissing={isModalDismissing}
        onReplacementComplete={handleReplacementComplete}
      />
    </div>
  )
}

type TransactionRowsProps = {
  transactions: WalletTransaction[]
  dismissingTxIds: Set<string>
  onSelectTx: (tx: WalletTransaction) => void
}

const TransactionRows: FC<TransactionRowsProps> = ({
  transactions,
  dismissingTxIds,
  onSelectTx,
}) => {
  const { ref: refContainer } = useScrollContainer()
  const ref = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: transactions.length,
    estimateSize: () => (IS_POPUP ? 52 : 58),
    overscan: 5,
    getScrollElement: () => refContainer?.current ?? document.getElementById("main"),
    gap: 8,
  })

  return (
    <div ref={ref}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const tx = transactions[item.index]
          if (!tx) return null

          return (
            <div
              data-testid="tx-history-row-transaction"
              key={item.key}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <TransactionRow
                tx={tx}
                onSelectTx={onSelectTx}
                isDismissing={dismissingTxIds.has(tx.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

type TxHistoryModalProps = {
  tx?: WalletTransaction
  isOpen: boolean
  onClose: () => void
  onDismiss: (tx: WalletTransaction) => void
  isDismissing: boolean
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

const TxHistoryModal: FC<TxHistoryModalProps> = ({
  tx,
  isOpen,
  onClose,
  onDismiss,
  isDismissing,
  onReplacementComplete,
}) => {
  const { t } = useTranslation()
  const network = useAnyNetwork(tx?.networkId)
  const explorerId = tx ? getExplorerTargetId(tx) : undefined

  const supportsProgress =
    !!tx && tx.status === "pending" && (tx.platform === "polkadot" || tx.platform === "ethereum")
  const modalClassNames = classNames(
    "border-grey-800 h-[60rem] w-[40rem] overflow-hidden bg-black shadow",
    IS_POPUP ? "max-h-full max-w-full" : "rounded-lg border",
  )

  const progressTx = supportsProgress
    ? (tx as WalletTransactionDot | WalletTransactionEth)
    : undefined

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onClose}
      className={modalClassNames}
      containerId={IS_POPUP ? "main" : undefined}
    >
      {!tx ? (
        <div className="text-body-disabled flex h-full items-center justify-center text-sm">
          {t("Transaction unavailable")}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="border-grey-850 border-b px-10 py-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <div className="text-body text-xl font-semibold">
                  {tx.label ?? t("Transaction details")}
                </div>
                <div className="text-body-disabled mt-2 text-sm">
                  <DistanceToNow timestamp={tx.timestamp} />
                </div>
                {network?.name ? (
                  <div className="text-body-disabled text-xs uppercase tracking-wide">
                    {network.name}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={t("Close")}
                onClick={onClose}
                className="hover:bg-grey-850 text-body-secondary flex h-10 w-10 items-center justify-center rounded-sm"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
          <div
            className={classNames("grow overflow-auto px-10 py-6", supportsProgress && "px-0 py-0")}
          >
            {supportsProgress && progressTx ? (
              <TxProgress
                hash={progressTx.hash as HexString}
                networkIdOrHash={progressTx.networkId}
                onClose={onClose}
                onReplacementComplete={onReplacementComplete}
              />
            ) : (
              <TxHistoryDetails tx={tx} network={network} />
            )}
          </div>
          <TxHistoryActions
            tx={tx}
            network={network}
            explorerId={explorerId}
            onDismiss={onDismiss}
            isDismissing={isDismissing}
          />
        </div>
      )}
    </Modal>
  )
}

type TxHistoryActionsProps = {
  tx: WalletTransaction
  network: ReturnType<typeof useAnyNetwork>
  explorerId?: string
  onDismiss: (tx: WalletTransaction) => void
  isDismissing: boolean
}

const TxHistoryActions: FC<TxHistoryActionsProps> = ({
  tx,
  network,
  explorerId,
  onDismiss,
  isDismissing,
}) => {
  const { t } = useTranslation()
  const swapInfo = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined

  const swapHref = useMemo(() => {
    if (!swapInfo) return undefined
    if (swapInfo.type === "swap-simpleswap" && swapInfo.exchangeId)
      return `https://simpleswap.io/exchange?id=${swapInfo.exchangeId}`
    if (swapInfo.type === "swap-stealthex" && swapInfo.exchangeId)
      return `https://stealthex.io/exchange?id=${swapInfo.exchangeId}`
    if (swapInfo.type === "swap-lifi" && tx.platform === "ethereum")
      return `https://scan.li.fi/tx/${tx.hash}`
    return undefined
  }, [swapInfo, tx])

  const explorerLinks = useMemo(() => {
    if (!network || !explorerId) return []
    return getBlockExplorerUrls(network, { type: "transaction", id: explorerId })
  }, [explorerId, network])

  const handleExternal = useCallback((url: string) => {
    window.open(url, "_blank")
    if (IS_EMBEDDED_POPUP) window.close()
  }, [])

  const handleDismiss = useCallback(() => onDismiss(tx), [onDismiss, tx])

  return (
    <div className="border-grey-850 border-t px-10 py-6">
      <div className="flex flex-wrap gap-4">
        {swapHref && tx.status === "success" && (
          <Button iconLeft={ExternalLinkIcon} onClick={() => handleExternal(swapHref)}>
            {t("View swap status")}
          </Button>
        )}
        {explorerLinks.map((url) => (
          <Button key={url} iconLeft={ExternalLinkIcon} onClick={() => handleExternal(url)}>
            {t("View on {{label}}", { label: getBlockExplorerLabel(url) })}
          </Button>
        ))}
        <Button
          iconLeft={TrashIcon}
          onClick={handleDismiss}
          processing={isDismissing}
          disabled={isDismissing}
        >
          {t("Dismiss transaction")}
        </Button>
      </div>
    </div>
  )
}

type DetailRow = {
  label: string
  value?: ReactNode
}

type TxHistoryDetailsProps = {
  tx: WalletTransaction
  network: ReturnType<typeof useAnyNetwork>
}

const TxHistoryDetails: FC<TxHistoryDetailsProps> = ({ tx, network }) => {
  const { t } = useTranslation()
  const transferInfo = isTxInfoTransfer(tx.txInfo) ? tx.txInfo : undefined
  const swapInfo = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined
  const approvalInfo = isTxInfoApproval(tx.txInfo) ? tx.txInfo : undefined

  const currency = useSelectedCurrency()

  const primaryTokenId = transferInfo?.tokenId ?? approvalInfo?.tokenId ?? swapInfo?.fromTokenId
  const primaryToken = useToken(primaryTokenId)
  const primaryRates = useTokenRates(primaryTokenId)
  const toTokenId = swapInfo?.toTokenId
  const toToken = useToken(toTokenId)
  const toTokenRates = useTokenRates(toTokenId)

  const primaryAmount = useMemo(() => {
    if (transferInfo && primaryToken)
      return new BalanceFormatter(transferInfo.value, primaryToken.decimals, primaryRates)
    if (approvalInfo && primaryToken)
      return new BalanceFormatter(approvalInfo.amount, primaryToken.decimals, primaryRates)
    if (swapInfo && primaryToken)
      return new BalanceFormatter(swapInfo.fromAmount, primaryToken.decimals, primaryRates)
    return null
  }, [approvalInfo, primaryRates, primaryToken, swapInfo, transferInfo])

  const toAmount = useMemo(() => {
    if (!swapInfo || !toToken) return null
    return new BalanceFormatter(swapInfo.toAmount, toToken.decimals, toTokenRates)
  }, [swapInfo, toToken, toTokenRates])

  const typeLabel = useMemo(() => {
    if (transferInfo) return t("Transfer")
    if (swapInfo) return t("Swap")
    if (approvalInfo) return t("Approval")
    return t("Transaction")
  }, [approvalInfo, swapInfo, t, transferInfo])

  const infoRows: DetailRow[] = []

  if (transferInfo) {
    infoRows.push({
      label: t("Amount"),
      value: <TxAmountValue amount={primaryAmount} token={primaryToken} currency={currency} />,
    })
    infoRows.push({ label: t("Recipient"), value: transferInfo.to })
  }

  if (approvalInfo) {
    infoRows.push({
      label: t("Allowance"),
      value: <TxAmountValue amount={primaryAmount} token={primaryToken} currency={currency} />,
    })
    infoRows.push({ label: t("Spender"), value: approvalInfo.contractAddress })
  }

  if (swapInfo) {
    infoRows.push({
      label: t("From"),
      value: <TxAmountValue amount={primaryAmount} token={primaryToken} currency={currency} />,
    })
    infoRows.push({
      label: t("To"),
      value: <TxAmountValue amount={toAmount} token={toToken} currency={currency} />,
    })
    if (swapInfo.to) infoRows.push({ label: t("Recipient"), value: swapInfo.to })
  }

  const submittedValue = (
    <div className="flex flex-col text-sm">
      <span>{new Date(tx.timestamp).toLocaleString()}</span>
      <span className="text-body-disabled text-xs">
        <DistanceToNow timestamp={tx.timestamp} />
      </span>
    </div>
  )

  const metadataRows: DetailRow[] = [
    { label: t("Status"), value: <TransactionStatusLabel status={tx.status} /> },
    { label: t("Type"), value: typeLabel },
    { label: t("Network"), value: network?.name ?? t("Unknown network") },
    { label: t("Account"), value: tx.account },
    { label: t("Submitted"), value: submittedValue },
  ]

  if ("nonce" in tx) {
    metadataRows.push({ label: t("Nonce"), value: tx.nonce?.toString() })
  }

  if ("blockNumber" in tx && tx.blockNumber) {
    metadataRows.push({ label: t("Block number"), value: tx.blockNumber })
  }

  if (tx.platform === "polkadot" && tx.extrinsicIndex) {
    metadataRows.push({ label: t("Extrinsic index"), value: tx.extrinsicIndex })
  }

  const explorerId = getExplorerTargetId(tx)
  metadataRows.push({ label: t("Transaction hash"), value: explorerId })

  if (tx.siteUrl) {
    metadataRows.push({
      label: t("Site"),
      value: (
        <a
          className="hover:text-body text-body break-words"
          href={tx.siteUrl}
          target="_blank"
          rel="noreferrer"
        >
          {tx.siteUrl}
        </a>
      ),
    })
  }

  if (tx.label) {
    metadataRows.push({ label: t("Label"), value: tx.label })
  }

  if (tx.platform === "ethereum" && tx.isReplacement) {
    metadataRows.push({ label: t("Replacement"), value: t("Yes") })
  }

  return (
    <div className="flex h-full flex-col gap-10 overflow-auto pr-1">
      {infoRows.length > 0 && (
        <section className="space-y-4">
          <div className="text-body-secondary text-xs uppercase tracking-wide">
            {t("Transaction details")}
          </div>
          <TxDetailGrid rows={infoRows} />
        </section>
      )}

      <section className="space-y-4">
        <div className="text-body-secondary text-xs uppercase tracking-wide">{t("Metadata")}</div>
        <TxDetailGrid rows={metadataRows} />
      </section>
    </div>
  )
}

const TxDetailGrid: FC<{ rows: DetailRow[] }> = ({ rows }) => {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-2">
          <div className="text-body-disabled text-xs uppercase tracking-wide">{row.label}</div>
          <div className="text-body break-words text-sm">{row.value ?? "—"}</div>
        </div>
      ))}
    </div>
  )
}

type TxAmountValueProps = {
  amount: BalanceFormatter | null
  token: ReturnType<typeof useToken>
  currency: ReturnType<typeof useSelectedCurrency>
}

const TxAmountValue: FC<TxAmountValueProps> = ({ amount, token, currency }) => {
  if (!amount || !token) return <span>—</span>

  return (
    <div className="flex flex-col gap-1">
      <Tokens
        className="pointer-events-none"
        amount={amount.tokens}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
        noTooltip
        isBalance
      />
      {amount.fiat(currency) ? <Fiat amount={amount} noCountUp isBalance /> : null}
    </div>
  )
}

const TransactionStatusLabel: FC<{ status: TransactionStatus }> = ({ status }) => {
  const { t } = useTranslation()

  switch (status) {
    case "error":
      return <span className="text-brand-orange">{t("Failed")}</span>
    case "pending":
      return (
        <>
          <span>{t("Submitting")} </span>
          <LoaderIcon className="animate-spin-slow text-body-disabled" />
        </>
      )
    case "success":
      return <span>{t("Confirmed")}</span>
    case "replaced":
      return (
        <>
          <span>{t("Cancelled")}</span>
          <XOctagonIcon className="text-brand-orange" />
        </>
      )
    case "unknown":
      return <span>{t("Unknown")}</span>
  }
}

const SwapTransactionStatusLabel = ({ tx }: { tx: WalletTransaction }) => {
  const { t } = useTranslation()
  const swapExchangeId =
    isTxInfoSwap(tx.txInfo) && "exchangeId" in tx.txInfo ? tx.txInfo.exchangeId : undefined
  const swapLifiHash =
    isTxInfoSwap(tx.txInfo) && tx.txInfo.type === "swap-lifi" && tx.platform === "ethereum"
      ? tx.hash
      : undefined
  const swapStatus = useSwapStatus(tx.txInfo?.type, swapExchangeId ?? swapLifiHash)

  // show regular tx status while tx is still submitting
  if (tx.status !== "success") return <TransactionStatusLabel status={tx.status} />

  switch (swapStatus) {
    case "waiting":
    case "confirming":
    case "exchanging":
    case "sending":
    case "verifying":
      return (
        <>
          {swapStatus === "waiting" ? <span>{t("Depositing funds")} </span> : null}
          {swapStatus === "confirming" ? <span>{t("Confirming")} </span> : null}
          {swapStatus === "exchanging" ? <span>{t("Exchanging")} </span> : null}
          {swapStatus === "sending" ? <span>{t("Sending")} </span> : null}
          {swapStatus === "verifying" ? <span>{t("Verifying")} </span> : null}
          <LoaderIcon className="animate-spin-slow text-body-disabled" />
        </>
      )
    case "failed":
    case "refunded":
    case "expired":
    case "invalid":
      return <TransactionStatusLabel status="error" />
    case "finished":
      return <TransactionStatusLabel status={tx.status} />
    default:
      return <TransactionStatusLabel status="unknown" />
  }
}
const SwapTransactionStatusLabelFallback = () => {
  const { t } = useTranslation()
  return (
    <>
      <span className="bg-body-disabled select-none rounded text-transparent">
        {t("Submitting")}{" "}
      </span>
      <LoaderIcon className="animate-spin-slow text-body-disabled" />
    </>
  )
}

type TransactionRowProps = {
  tx: WalletTransaction
  onSelectTx: (tx: WalletTransaction) => void
  isDismissing: boolean
}

type TransactionRowEthProps = TransactionRowProps & { tx: WalletTransactionEth }
type TransactionRowDotProps = TransactionRowProps & { tx: WalletTransactionDot }
type TransactionRowSolProps = TransactionRowProps & { tx: WalletTransactionSol }

const Favicon: FC<{ siteUrl: string; className?: string }> = ({ siteUrl, className }) => {
  const iconUrl = useFaviconUrl(siteUrl)
  const [isError, setError] = useState(false)

  const handleError = useCallback(() => {
    setError(true)
  }, [])

  if (!iconUrl) return null
  if (isError) return <NetworkLogo className={className} />

  return (
    <img
      loading="lazy"
      src={iconUrl}
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      className={className}
      alt=""
      onError={handleError}
    />
  )
}

const TxIconContainer = ({
  className,
  tooltip,
  networkId,
  children,
}: {
  className?: string
  tooltip?: string | null
  networkId?: NetworkId
  children?: ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger className={classNames("relative h-16 w-16 shrink-0 cursor-default", className)}>
      {children}
      {!!networkId && (
        <NetworkLogo
          networkId={networkId}
          className="border-grey-800 !absolute right-[-4px] top-[-4px] h-8 w-8 rounded-full border"
        />
      )}
    </TooltipTrigger>
    <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
      {tooltip}
    </TooltipContent>
  </Tooltip>
)

const displayDistanceToNow = (timestamp: number, locale: Locale) =>
  Date.now() - timestamp > 60_000
    ? formatDistanceToNowStrict(timestamp, { addSuffix: true, locale })
    : i18next.t("Just now")

const DistanceToNow: FC<{ timestamp: number }> = ({ timestamp }) => {
  const locale = useDateFnsLocale()
  const [text, setText] = useState(() => displayDistanceToNow(timestamp, locale))

  useEffect(() => {
    const interval = setInterval(() => {
      setText(displayDistanceToNow(timestamp, locale))
    }, 10_000)

    return () => clearInterval(interval)
  }, [locale, text, timestamp])

  return <>{text}</>
}

const TransactionRowBase: FC<{
  logo: ReactNode
  status: ReactNode
  wen: ReactNode
  tokens: ReactNode
  fiat: ReactNode
  onClick: () => void
  isBusy?: boolean
}> = ({ logo, status, wen, tokens, fiat, onClick, isBusy }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className={classNames(
        "bg-grey-850 relative z-0 flex w-full grow items-center rounded-sm text-left transition",
        IS_POPUP ? "h-[5.2rem] gap-6 px-6" : "h-[5.8rem] gap-8 px-8",
        !isBusy && "hover:bg-grey-800",
        isBusy && "cursor-wait opacity-60",
      )}
    >
      {logo}
      <div className="leading-paragraph flex w-full grow justify-between">
        <div className="flex flex-col items-start justify-center">
          <div
            className={classNames(
              "text-body flex h-10 items-center gap-2 font-bold",
              IS_POPUP ? "text-sm" : "text-base",
            )}
          >
            {status}
          </div>
          <div className={classNames("text-body-disabled", IS_POPUP ? "text-xs" : "text-sm")}>
            {wen}
          </div>
        </div>
        <div className="flex flex-col items-end justify-center text-right">
          <div className={classNames("text-body", IS_POPUP ? "text-sm" : "text-base")}>
            {tokens}
          </div>
          <div className={classNames("text-body-disabled", IS_POPUP ? "text-xs" : "text-sm")}>
            {fiat}
          </div>
        </div>
      </div>
      {isBusy && (
        <LoaderIcon className="text-body-disabled animate-spin-slow absolute right-6 top-1/2 -translate-y-1/2" />
      )}
    </button>
  )
}

const TransactionRowEvm: FC<TransactionRowEthProps> = ({ tx, onSelectTx, isDismissing }) => {
  const evmNetwork = useNetworkById(tx.networkId, "ethereum")

  const txTransfer = isTxInfoTransfer(tx.txInfo) ? tx.txInfo : undefined
  const txSwap = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined
  const txApproval = isTxInfoApproval(tx.txInfo) ? tx.txInfo : undefined

  const tokenId = txTransfer?.tokenId || txSwap?.fromTokenId || txApproval?.tokenId

  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const currency = useSelectedCurrency()

  const { isTransfer, amount } = useMemo(() => {
    // legacy entries do not have a type, in that case assume it's a transfer
    const isTransfer = token && txTransfer

    return {
      isTransfer,
      amount: isTransfer
        ? new BalanceFormatter(txTransfer?.value, token.decimals, tokenRates)
        : null,
    }
  }, [token, tokenRates, txTransfer])

  const fromToken = useToken(txSwap?.fromTokenId)
  const toToken = useToken(txSwap?.toTokenId)

  const handleRowClick = useCallback(() => onSelectTx(tx), [onSelectTx, tx])

  const { t } = useTranslation()

  return (
    <TransactionRowBase
      logo={
        tx.siteUrl ? (
          <TxIconContainer tooltip={tx.siteUrl} networkId={evmNetwork?.id}>
            <Favicon siteUrl={tx.siteUrl} className="!h-16 !w-16" />
          </TxIconContainer>
        ) : txSwap ? (
          <div className="flex items-center">
            <TxIconContainer networkId={fromToken?.networkId ?? fromToken?.networkId}>
              <TokenLogo tokenId={fromToken?.id} className="!h-16 !w-16" />
            </TxIconContainer>
            <TxIconContainer className="-ml-4" networkId={toToken?.networkId ?? toToken?.networkId}>
              <TokenLogo tokenId={toToken?.id} className="!h-16 !w-16" />
            </TxIconContainer>
          </div>
        ) : isTransfer && token ? (
          <TxIconContainer
            tooltip={`${token?.symbol} on ${evmNetwork?.name}`}
            networkId={evmNetwork?.id}
          >
            <TokenLogo tokenId={token.id} className="!h-16 !w-16" />
          </TxIconContainer>
        ) : (
          <TxIconContainer tooltip={evmNetwork?.name}>
            <NetworkLogo networkId={evmNetwork?.id} className="!h-16 !w-16" />
          </TxIconContainer>
        )
      }
      status={
        <>
          {txSwap ? (
            <Suspense fallback={<SwapTransactionStatusLabelFallback />}>
              <SwapTransactionStatusLabel tx={tx} />
            </Suspense>
          ) : (
            <TransactionStatusLabel status={tx.status} />
          )}
          {tx.isReplacement && (
            <span className="bg-alert-warn/25 text-alert-warn rounded px-3 py-1 text-[10px] font-light">
              {t("Replacement")}
            </span>
          )}
        </>
      }
      wen={<DistanceToNow timestamp={tx.timestamp} />}
      onClick={handleRowClick}
      isBusy={isDismissing}
      tokens={
        txSwap ? (
          // tx is a swap deposit
          <div className="flex flex-col">
            <div className="flex items-center justify-end gap-1">
              <Tokens
                className="pointer-events-none"
                amount={planckToTokens(txSwap.fromAmount, fromToken?.decimals)}
                decimals={fromToken?.decimals}
                noCountUp
                noTooltip
                symbol={fromToken?.symbol}
                isBalance
              />
              <ArrowRightIcon className="text-body-inactive" />
            </div>
            <Tokens
              className="pointer-events-none"
              amount={planckToTokens(txSwap.toAmount, toToken?.decimals)}
              decimals={toToken?.decimals ?? 0}
              noCountUp
              noTooltip
              symbol={toToken?.symbol}
              isBalance
            />
          </div>
        ) : (
          !!amount &&
          !!token && (
            <Tokens
              className="pointer-events-none"
              amount={amount.tokens}
              decimals={token.decimals}
              noCountUp
              noTooltip
              symbol={token.symbol}
              isBalance
            />
          )
        )
      }
      fiat={
        isTransfer &&
        !!amount &&
        !!amount.fiat(currency) && <Fiat amount={amount} noCountUp isBalance />
      }
    />
  )
}

const TransactionRowDot: FC<TransactionRowDotProps> = ({ tx, onSelectTx, isDismissing }) => {
  const { genesisHash } = tx.payload

  const txTransfer = isTxInfoTransfer(tx.txInfo) ? tx.txInfo : undefined
  const txSwap = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined

  const tokenId = txTransfer?.tokenId || txSwap?.fromTokenId

  const chain = useNetworkByGenesisHash(genesisHash)
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const currency = useSelectedCurrency()

  const { isTransfer, amount } = useMemo(() => {
    // historically txInfo wasnt a property, transfer params were set on the tx object
    const isTransfer = token && txTransfer

    return {
      isTransfer,
      amount: isTransfer
        ? new BalanceFormatter(txTransfer?.value, token.decimals, tokenRates)
        : null,
    }
  }, [token, tokenRates, txTransfer])

  const fromToken = useToken(txSwap?.fromTokenId)
  const toToken = useToken(txSwap?.toTokenId)

  const handleRowClick = useCallback(() => onSelectTx(tx), [onSelectTx, tx])

  return (
    <TransactionRowBase
      onClick={handleRowClick}
      isBusy={isDismissing}
      logo={
        tx.siteUrl ? (
          <TxIconContainer tooltip={tx.siteUrl} networkId={chain?.id}>
            <Favicon siteUrl={tx.siteUrl} className="!h-16 !w-16" />
          </TxIconContainer>
        ) : txSwap ? (
          <div className="flex items-center">
            <TxIconContainer networkId={fromToken?.networkId ?? fromToken?.networkId}>
              <TokenLogo tokenId={fromToken?.id} className="!h-16 !w-16" />
            </TxIconContainer>
            <TxIconContainer className="-ml-4" networkId={toToken?.networkId ?? toToken?.networkId}>
              <TokenLogo tokenId={toToken?.id} className="!h-16 !w-16" />
            </TxIconContainer>
          </div>
        ) : isTransfer && token ? (
          <TxIconContainer tooltip={`${token?.symbol} on ${chain?.name}`} networkId={chain?.id}>
            <TokenLogo tokenId={token.id} className="!h-16 !w-16" />
          </TxIconContainer>
        ) : (
          <TxIconContainer tooltip={chain?.name}>
            <NetworkLogo networkId={chain?.id} className="!h-16 !w-16" />
          </TxIconContainer>
        )
      }
      status={
        <>
          {txSwap ? (
            <Suspense fallback={<SwapTransactionStatusLabelFallback />}>
              <SwapTransactionStatusLabel tx={tx} />
            </Suspense>
          ) : (
            <TransactionStatusLabel status={tx.status} />
          )}
        </>
      }
      wen={<DistanceToNow timestamp={tx.timestamp} />}
      tokens={
        txSwap ? (
          // tx is a swap deposit
          <div className="flex flex-col">
            <div className="flex items-center justify-end gap-1">
              <Tokens
                className="pointer-events-none"
                amount={planckToTokens(txSwap.fromAmount, fromToken?.decimals)}
                decimals={fromToken?.decimals}
                symbol={fromToken?.symbol}
                noCountUp
                noTooltip
                isBalance
              />
              <ArrowRightIcon className="text-body-inactive" />
            </div>
            <Tokens
              className="pointer-events-none"
              amount={planckToTokens(txSwap.toAmount, toToken?.decimals)}
              decimals={toToken?.decimals ?? 0}
              symbol={toToken?.symbol}
              noCountUp
              noTooltip
              isBalance
            />
          </div>
        ) : (
          !!amount &&
          !!token && (
            <Tokens
              className="pointer-events-none"
              amount={amount.tokens}
              decimals={token.decimals}
              noCountUp
              noTooltip
              symbol={token.symbol}
              isBalance
            />
          )
        )
      }
      fiat={
        isTransfer &&
        !!amount &&
        !!amount.fiat(currency) && <Fiat amount={amount} noCountUp isBalance />
      }
    />
  )
}

const TransactionRowSol: FC<TransactionRowSolProps> = ({ tx, onSelectTx, isDismissing }) => {
  const txTransfer = isTxInfoTransfer(tx.txInfo) ? tx.txInfo : undefined
  const txSwap = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined
  const txApproval = isTxInfoApproval(tx.txInfo) ? tx.txInfo : undefined

  const tokenId = txTransfer?.tokenId || txSwap?.fromTokenId || txApproval?.tokenId

  const chain = useNetworkById(tx.networkId, "solana")
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const currency = useSelectedCurrency()

  const { isTransfer, amount } = useMemo(() => {
    // historically txInfo wasnt a property, transfer params were set on the tx object
    const isTransfer = token && txTransfer

    return {
      isTransfer,
      amount: isTransfer
        ? new BalanceFormatter(txTransfer?.value, token.decimals, tokenRates)
        : null,
    }
  }, [token, tokenRates, txTransfer])

  const fromToken = useToken(txSwap?.fromTokenId)
  const toToken = useToken(txSwap?.toTokenId)

  const handleRowClick = useCallback(() => onSelectTx(tx), [onSelectTx, tx])

  return (
    <TransactionRowBase
      onClick={handleRowClick}
      isBusy={isDismissing}
      logo={
        tx.siteUrl ? (
          <TxIconContainer tooltip={tx.siteUrl} networkId={chain?.id}>
            <Favicon siteUrl={tx.siteUrl} className="!h-16 !w-16" />
          </TxIconContainer>
        ) : txSwap ? (
          <div className="flex items-center">
            <TxIconContainer networkId={fromToken?.networkId ?? fromToken?.networkId}>
              <TokenLogo tokenId={fromToken?.id} className="!h-16 !w-16" />
            </TxIconContainer>
            <TxIconContainer className="-ml-4" networkId={toToken?.networkId ?? toToken?.networkId}>
              <TokenLogo tokenId={toToken?.id} className="!h-16 !w-16" />
            </TxIconContainer>
          </div>
        ) : isTransfer && token ? (
          <TxIconContainer tooltip={`${token?.symbol} on ${chain?.name}`} networkId={chain?.id}>
            <TokenLogo tokenId={token.id} className="!h-16 !w-16" />
          </TxIconContainer>
        ) : (
          <TxIconContainer tooltip={chain?.name}>
            <NetworkLogo networkId={chain?.id} className="!h-16 !w-16" />
          </TxIconContainer>
        )
      }
      status={
        txSwap ? (
          <Suspense fallback={<SwapTransactionStatusLabelFallback />}>
            <SwapTransactionStatusLabel tx={tx} />
          </Suspense>
        ) : (
          <TransactionStatusLabel status={tx.status} />
        )
      }
      wen={<DistanceToNow timestamp={tx.timestamp} />}
      tokens={
        txSwap ? (
          // tx is a swap deposit
          <div className="flex flex-col">
            <div className="flex items-center justify-end gap-1">
              <Tokens
                className="pointer-events-none"
                amount={planckToTokens(txSwap.fromAmount, fromToken?.decimals)}
                decimals={fromToken?.decimals}
                symbol={fromToken?.symbol}
                noCountUp
                noTooltip
                isBalance
              />
              <ArrowRightIcon className="text-body-inactive" />
            </div>
            <Tokens
              className="pointer-events-none"
              amount={planckToTokens(txSwap.toAmount, toToken?.decimals)}
              decimals={toToken?.decimals ?? 0}
              symbol={toToken?.symbol}
              noCountUp
              noTooltip
              isBalance
            />
          </div>
        ) : (
          !!amount &&
          !!token && (
            <Tokens
              className="pointer-events-none"
              amount={amount.tokens}
              decimals={token.decimals}
              noCountUp
              noTooltip
              symbol={token.symbol}
              isBalance
            />
          )
        )
      }
      fiat={
        isTransfer &&
        !!amount &&
        !!amount.fiat(currency) && <Fiat amount={amount} noCountUp isBalance />
      }
    />
  )
}

const TransactionRow: FC<TransactionRowProps> = ({ tx, ...props }) => {
  switch (tx.platform) {
    case "ethereum":
      return <TransactionRowEvm tx={tx} {...props} />
    case "polkadot":
      return <TransactionRowDot tx={tx} {...props} />
    case "solana":
      return <TransactionRowSol tx={tx} {...props} />
    default:
      return null
  }
}

const TransactionRowShimmer = () => {
  return (
    <TransactionRowBase
      onClick={() => undefined}
      isBusy={false}
      logo={<div className="bg-grey-800 h-16 w-16 shrink-0 animate-pulse rounded-full" />}
      status={
        <div className="bg-grey-800 text-grey-800 rounded-xs mb-1 animate-pulse text-sm">
          Dunno yet
        </div>
      }
      wen={
        <div className="bg-grey-800 text-grey-800 rounded-xs mt-1 animate-pulse text-xs">
          Very long time ago
        </div>
      }
      tokens={null}
      fiat={null}
    />
  )
}
