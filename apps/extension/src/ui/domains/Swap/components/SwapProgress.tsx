import type { WalletTransaction, WalletTransactionInfo } from "@core/domains/transactions/types"
import {
  getBlockExplorerUrls,
  type Network,
  networkIdFromTokenId,
} from "@talismn/chaindata-provider"
import { ExternalLinkIcon, LoaderIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { ProcessAnimation } from "@ui/components/ProcessAnimation/ProcessAnimation"
import { getCanonicalTransaction } from "@ui/domains/Transactions/getCanonicalTransaction"
import { type ReplacementCallbackArgs, TxReplaceActions } from "@ui/domains/Transactions/TxProgress"
import { useAnyNetwork } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { getSwapProgressDetails, type SwapStatusDetails } from "./swapProgressStatus"

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

/**
 * Non-suspending hook — uses Dexie's useLiveQuery (returns undefined while loading).
 * When the tracked tx lost a speed-up nonce race, resolves to the mined transaction.
 */
const useCanonicalTransaction = (hash: string): WalletTransaction | null | undefined =>
  useLiveQuery(async () => {
    if (!hash) return undefined
    return getCanonicalTransaction(hash)
  }, [hash])

const useSwapProgressStatus = (
  tx: WalletTransaction | null | undefined,
  txInfo: WalletTransactionInfo
): SwapStatusDetails => {
  const { t } = useTranslation()

  const isCrossChain = useMemo(
    () =>
      "fromTokenId" in txInfo &&
      networkIdFromTokenId(txInfo.fromTokenId) !== networkIdFromTokenId(txInfo.toTokenId),
    [txInfo]
  )

  return useMemo<SwapStatusDetails>(
    () => getSwapProgressDetails(t, tx, isCrossChain),
    [tx, isCrossChain, t]
  )
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

  const tx = useCanonicalTransaction(hash)
  // tx may point at the winning same-nonce tx after a lost speed-up race
  const txHash = tx?.id ?? hash

  const { title, subtitle, animStatus, pillLabel } = useSwapProgressStatus(tx, txInfo)
  const network = useAnyNetwork(networkId)

  const blockNumber = useMemo(() => {
    if (!tx) return undefined
    if ("blockNumber" in tx) return tx.blockNumber
    return undefined
  }, [tx])

  const explorerUrl = useMemo(() => getBlockExplorerUrl(network, txHash), [network, txHash])
  const swapTrackerUrl = useMemo(() => getSwapTrackerUrl(txInfo, txHash), [txInfo, txHash])

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
        <TxReplaceActions
          tx={tx}
          className="mt-0"
          containerId="swap-modal"
          onReplacementComplete={onReplacementComplete}
        />
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
