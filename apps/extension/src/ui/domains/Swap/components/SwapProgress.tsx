import { db } from "@core/db"
import type {
  SwapStatus,
  WalletTransaction,
  WalletTransactionInfo,
} from "@core/domains/transactions/types"
import { getBlockExplorerUrls, type Network } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import {
  ProcessAnimation,
  type ProcessAnimationStatus,
} from "@ui/components/ProcessAnimation/ProcessAnimation"
import { useAnyNetwork } from "@ui/state/chaindata"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useMemo } from "react"
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

type SwapStatusPhase = "submitting" | "exchange-in-progress" | "success" | "failure" | "unknown"

type SwapStatusDetails = {
  phase: SwapStatusPhase
  title: string
  subtitle: string
  animStatus: ProcessAnimationStatus
}

const useSwapProgressStatus = (
  txHash: string,
  _networkId: string,
  _txInfo: WalletTransactionInfo
): SwapStatusDetails => {
  const { t } = useTranslation()

  const tx = useTransactionLocal(txHash)
  const swapStatus: SwapStatus | undefined = tx?.swapStatus

  return useMemo<SwapStatusDetails>(() => {
    // Phase 1: On-chain tx is still pending/processing
    if (!tx || tx.status === "pending") {
      return {
        phase: "submitting",
        title: t("Swap in progress"),
        subtitle: t("Submitting your transaction to the network."),
        animStatus: "processing",
      }
    }

    // On-chain tx failed
    if (tx.status === "error") {
      return {
        phase: "failure",
        title: t("Transaction failed"),
        subtitle: t("Your swap transaction failed on-chain."),
        animStatus: "failure",
      }
    }

    // On-chain tx status unknown
    if (tx.status === "unknown") {
      return {
        phase: "unknown",
        title: t("Transaction not found"),
        subtitle: t("Transaction was submitted, but Talisman is unable to track its progress."),
        animStatus: "failure",
      }
    }

    // On-chain tx replaced
    if (tx.status === "replaced") {
      return {
        phase: "failure",
        title: t("Transaction cancelled"),
        subtitle: t("This transaction has been replaced with another one."),
        animStatus: "failure",
      }
    }

    // Phase 2: On-chain tx succeeded — track exchange/protocol status
    switch (swapStatus) {
      case "waiting":
        return {
          phase: "exchange-in-progress",
          title: t("Depositing funds"),
          subtitle: t("Your deposit is being processed by the exchange."),
          animStatus: "processing",
        }
      case "confirming":
        return {
          phase: "exchange-in-progress",
          title: t("Confirming deposit"),
          subtitle: t("The exchange is confirming your deposit."),
          animStatus: "processing",
        }
      case "exchanging":
        return {
          phase: "exchange-in-progress",
          title: t("Exchanging"),
          subtitle: t("Your tokens are being exchanged."),
          animStatus: "processing",
        }
      case "sending":
        return {
          phase: "exchange-in-progress",
          title: t("Sending funds"),
          subtitle: t("The exchange is sending your tokens."),
          animStatus: "processing",
        }
      case "verifying":
        return {
          phase: "exchange-in-progress",
          title: t("Verifying"),
          subtitle: t("The exchange is verifying the transaction."),
          animStatus: "processing",
        }
      case "finished":
        return {
          phase: "success",
          title: t("Swap complete"),
          subtitle: t("Your swap was successful!"),
          animStatus: "success",
        }
      case "failed":
      case "expired":
      case "refunded":
        return {
          phase: "failure",
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
          phase: "unknown",
          title: t("Swap status unknown"),
          subtitle: t(
            "Your transaction succeeded on-chain but the swap tracker couldn't confirm the result. Please check your balance."
          ),
          animStatus: "failure",
        }
      default:
        // Swap status not yet loaded — show generic processing for confirmed tx
        return {
          phase: "exchange-in-progress",
          title: t("Swap in progress"),
          subtitle: t("Waiting for the exchange to process your swap."),
          animStatus: "processing",
        }
    }
  }, [tx, swapStatus, t])
}

type SwapProgressProps = {
  hash: string
  networkId: string
  txInfo: WalletTransactionInfo
  onClose: () => void
}

export const SwapProgress: FC<SwapProgressProps> = ({ hash, networkId, txInfo, onClose }) => {
  const { t } = useTranslation()
  const { title, subtitle, animStatus } = useSwapProgressStatus(hash, networkId, txInfo)

  const tx = useTransactionLocal(hash)
  const network = useAnyNetwork(networkId)

  const blockNumber = useMemo(() => {
    if (!tx) return undefined
    if ("blockNumber" in tx) return tx.blockNumber
    return undefined
  }, [tx])

  const explorerUrl = useMemo(() => getBlockExplorerUrl(network, hash), [network, hash])
  const swapTrackerUrl = useMemo(() => getSwapTrackerUrl(txInfo, hash), [txInfo, hash])

  return (
    <div className="flex h-full w-full flex-col items-center p-12">
      <div className="mt-8 font-bold text-body text-lg">{title}</div>
      <div className="mt-12 text-center font-light text-base text-body-secondary">{subtitle}</div>
      <ProcessAnimation status={animStatus} className="mt-[4.6875rem] mb-8 h-[9.0625rem]" />
      <div className="flex w-full grow flex-col justify-center gap-10 px-10 text-center text-body-secondary">
        <div>
          {blockNumber ? (
            <>
              {tx?.confirmed ? t("Confirmed in") : t("Included in")}{" "}
              {explorerUrl ? (
                <a target="_blank" className="text-grey-200 hover:text-body" href={explorerUrl}>
                  {t("block #{{blockNumber}}", { blockNumber })}{" "}
                  <ExternalLinkIcon className="inline align-text-top" />
                </a>
              ) : (
                <span className="text-body">{t("block #{{blockNumber}}", { blockNumber })}</span>
              )}
            </>
          ) : explorerUrl ? (
            <a target="_blank" className="text-grey-200 hover:text-body" href={explorerUrl}>
              {t("View on block explorer")} <ExternalLinkIcon className="inline align-text-top" />
            </a>
          ) : null}
        </div>
        <div>
          {swapTrackerUrl && (
            <a target="_blank" className="text-grey-200 hover:text-body" href={swapTrackerUrl}>
              {t("Track swap progress")} <ExternalLinkIcon className="inline align-text-top" />
            </a>
          )}
        </div>
      </div>
      <Button fullWidth onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}
