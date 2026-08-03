import { db } from "@core/db"
import type {
  SwapStatus,
  WalletTransaction,
  WalletTransactionInfo,
} from "@core/domains/transactions/types"
import {
  getBlockExplorerUrls,
  type Network,
  networkIdFromTokenId,
} from "@talismn/chaindata-provider"
import { ExternalLinkIcon, LoaderIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import {
  ProcessAnimation,
  type ProcessAnimationStatus,
} from "@ui/components/ProcessAnimation/ProcessAnimation"
import { type ReplacementCallbackArgs, TxReplaceActions } from "@ui/domains/Transactions/TxProgress"
import { useAnyNetwork } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

const getBlockExplorerUrl = (network: Network | undefined | null, hash: string) => {
  if (!network) return null
  return getBlockExplorerUrls(network, { type: "transaction", id: hash })[0] ?? null
}

const getSwapTrackerUrl = (txInfo: WalletTransactionInfo, txHash: string): string | null => {
  switch (txInfo.type) {
    case "swap-simpleswap":
      return txInfo.exchangeId ? `https://simpleswap.io/exchange?id=${txInfo.exchangeId}` : null
    case "swap-stealthex":
      return txInfo.exchangeId ? `https://stealthex.io/exchange?id=${txInfo.exchangeId}` : null
    case "swap-lifi":
      return `https://scan.li.fi/tx/${txHash}`
    default:
      return null
  }
}

/** Non-suspending hook — uses Dexie's useLiveQuery (returns undefined while loading). */
const useTransactionLocal = (hash: string): WalletTransaction | null | undefined =>
  useLiveQuery(async () => {
    if (!hash) return undefined
    return (await db.transactionsV2.get(hash)) ?? null
  }, [hash])

type SwapStatusDetails = {
  title: string
  subtitle: string
  animStatus: ProcessAnimationStatus
  pillLabel?: string
}

const useSwapProgressStatus = (
  txHash: string,
  txInfo: WalletTransactionInfo
): SwapStatusDetails => {
  const { t } = useTranslation()

  const tx = useTransactionLocal(txHash)
  const swapStatus: SwapStatus | undefined = tx?.swapStatus

  const isCrossChain = useMemo(
    () =>
      "fromTokenId" in txInfo &&
      networkIdFromTokenId(txInfo.fromTokenId) !== networkIdFromTokenId(txInfo.toTokenId),
    [txInfo]
  )

  return useMemo<SwapStatusDetails>(() => {
    // Pill labels match the swap status labels used in TxHistoryList
    const inProgress = (pillLabel: string): SwapStatusDetails => ({
      title: t("Transaction in progress"),
      subtitle: isCrossChain ? t("This may take a few minutes") : t("This may take a moment"),
      animStatus: "processing",
      pillLabel,
    })

    // Phase 1: On-chain tx is still pending/processing
    if (!tx || tx.status === "pending") return inProgress(t("Submitting"))

    // On-chain tx failed
    if (tx.status === "error") {
      return {
        title: t("Transaction failed"),
        subtitle: t("Your swap transaction failed on-chain."),
        animStatus: "failure",
      }
    }

    // On-chain tx status unknown
    if (tx.status === "unknown") {
      return {
        title: t("Transaction not found"),
        subtitle: t("Transaction was submitted, but Talisman is unable to track its progress."),
        animStatus: "failure",
      }
    }

    // On-chain tx replaced
    if (tx.status === "replaced") {
      return {
        title: t("Transaction cancelled"),
        subtitle: t("This transaction has been replaced with another one."),
        animStatus: "failure",
      }
    }

    // Phase 2: On-chain tx succeeded — track exchange/protocol status
    switch (swapStatus) {
      case "waiting":
        return inProgress(t("Depositing funds"))
      case "confirming":
        return inProgress(t("Confirming"))
      case "exchanging":
        return inProgress(t("Exchanging"))
      case "sending":
        return inProgress(t("Sending"))
      case "verifying":
        return inProgress(t("Verifying"))
      case "finished":
        return {
          title: t("Swap complete"),
          subtitle: t("Your swap was successful!"),
          animStatus: "success",
        }
      case "failed":
      case "expired":
      case "refunded":
        return {
          title: t("Swap failed"),
          subtitle:
            swapStatus === "refunded"
              ? t("The exchange has refunded your tokens.")
              : swapStatus === "expired"
                ? t("The exchange has expired.")
                : t("The exchange failed to complete your swap."),
          animStatus: "failure",
        }
      case "invalid":
        // LiFi's status API sometimes fails to parse transactions (especially Solana)
        // even though the on-chain tx succeeded. Show an ambiguous status instead of
        // a definitive "Swap failed" since the user's funds may have been swapped.
        return {
          title: t("Swap status unknown"),
          subtitle: t(
            "Your transaction succeeded on-chain but the swap tracker couldn't confirm the result. Please check your balance."
          ),
          animStatus: "failure",
        }
      default:
        // Swap status not yet loaded — exchange hasn't seen the deposit yet
        return inProgress(t("Depositing funds"))
    }
  }, [tx, swapStatus, isCrossChain, t])
}

const SwapStatusPill: FC<{ label: string | null | undefined }> = ({ label }) => (
  <div
    className={cn(
      "inline-flex items-center gap-3 rounded-full bg-grey-800 p-4 text-primary text-xs",
      !label && "invisible"
    )}
  >
    <LoaderIcon className="animate-spin-slow text-sm" />
    <span>{label}</span>
  </div>
)

type SwapProgressProps = {
  hash: string
  networkId: string
  txInfo: WalletTransactionInfo
  onClose: () => void
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

export const SwapProgress: FC<SwapProgressProps> = ({
  hash,
  networkId,
  txInfo,
  onClose,
  onReplacementComplete,
}) => {
  const { t } = useTranslation()
  const { title, subtitle, animStatus, pillLabel } = useSwapProgressStatus(hash, txInfo)

  const tx = useTransactionLocal(hash)
  const network = useAnyNetwork(networkId)

  const blockNumber = useMemo(() => {
    if (!tx) return undefined
    if ("blockNumber" in tx) return tx.blockNumber
    return undefined
  }, [tx])

  const explorerUrl = useMemo(() => getBlockExplorerUrl(network, hash), [network, hash])
  const swapTrackerUrl = useMemo(() => getSwapTrackerUrl(txInfo, hash), [txInfo, hash])

  const handleTrackClick = useCallback(() => {
    if (swapTrackerUrl) window.open(swapTrackerUrl, "_blank", "noopener")
  }, [swapTrackerUrl])

  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden p-12">
      <div className="mt-8 font-bold text-body text-lg">{title}</div>
      <div className="mt-12 text-center font-light text-base text-body-secondary">{subtitle}</div>
      <ProcessAnimation status={animStatus} className="mt-16 mb-8 h-36.25" />
      <div className="flex w-full grow flex-col items-center justify-center gap-8 px-10 text-center text-body-secondary">
        <div>
          {blockNumber ? (
            <>
              {tx?.confirmed ? t("Confirmed in") : t("Included in")}{" "}
              {explorerUrl ? (
                <a
                  target="_blank"
                  className="text-grey-200 hover:text-body"
                  href={explorerUrl}
                  rel="noopener"
                >
                  {t("block #{{blockNumber}}", { blockNumber })}{" "}
                  <ExternalLinkIcon className="inline align-text-top" />
                </a>
              ) : (
                <span className="text-body">{t("block #{{blockNumber}}", { blockNumber })}</span>
              )}
            </>
          ) : explorerUrl ? (
            <a
              target="_blank"
              className="text-grey-200 hover:text-body"
              href={explorerUrl}
              rel="noopener"
            >
              {t("View on block explorer")} <ExternalLinkIcon className="inline align-text-top" />
            </a>
          ) : null}
        </div>
        <SwapStatusPill label={pillLabel} />
        <TxReplaceActions tx={tx} className="mt-0" onReplacementComplete={onReplacementComplete} />
      </div>
      <div className="flex w-full flex-col gap-4 pt-6">
        {swapTrackerUrl && (
          <Button primary fullWidth onClick={handleTrackClick}>
            {t("Track swap progress")}
          </Button>
        )}
        <Button primary={!swapTrackerUrl} fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </div>
  )
}
