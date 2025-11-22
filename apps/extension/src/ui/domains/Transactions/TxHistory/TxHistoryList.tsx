import { BalanceFormatter } from "@talismn/balances"
import { NetworkId } from "@talismn/chaindata-provider"
import { ArrowRightIcon, LoaderIcon, XOctagonIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
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
import { FC, ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useScrollContainer } from "@talisman/components/ScrollContainer"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useSwapStatus } from "@ui/domains/Swap/hooks/useSwapStatus"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import {
  useNetworkByGenesisHash,
  useNetworkById,
  useSelectedCurrency,
  useToken,
  useTokenRates,
} from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { ReplacementCallbackArgs } from "../TxProgress"
import { DistanceToNow } from "./DistanceToNow"
import { useTxHistory } from "./TxHistoryContext"
import { TxHistoryModal } from "./TxHistoryModal"

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

const TransactionRows: FC<TransactionRowsProps> = ({ transactions, onSelectTx }) => {
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
              <TransactionRow tx={tx} onSelectTx={onSelectTx} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

type TransactionRowProps = {
  tx: WalletTransaction
  onSelectTx: (tx: WalletTransaction) => void
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
    <TooltipTrigger asChild>
      <div className={classNames("relative h-16 w-16 shrink-0", className)}>
        {children}
        {!!networkId && (
          <NetworkLogo
            networkId={networkId}
            className="border-grey-800 !absolute right-[-4px] top-[-4px] h-8 w-8 rounded-full border"
          />
        )}
      </div>
    </TooltipTrigger>
    <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
      {tooltip}
    </TooltipContent>
  </Tooltip>
)
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

const TransactionRowBase: FC<{
  logo: ReactNode
  status: ReactNode
  wen: ReactNode
  tokens: ReactNode
  fiat: ReactNode
  onClick?: () => void
}> = ({ logo, status, wen, tokens, fiat, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={classNames(
        "bg-grey-850 hover:bg-grey-800 relative z-0 flex w-full grow items-center rounded-sm text-left",
        IS_POPUP ? "h-[5.2rem] gap-6 px-6" : "h-[5.8rem] gap-8 px-8",
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
    </button>
  )
}

const TransactionRowEvm: FC<TransactionRowEthProps> = ({ tx, onSelectTx }) => {
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

const TransactionRowDot: FC<TransactionRowDotProps> = ({ tx, onSelectTx }) => {
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

const TransactionRowSol: FC<TransactionRowSolProps> = ({ tx, onSelectTx }) => {
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
