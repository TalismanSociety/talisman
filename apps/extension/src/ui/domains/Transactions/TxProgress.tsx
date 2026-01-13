import type { HexString } from "@polkadot/util/types"
import { getBlockExplorerUrls, type Network } from "@talismn/chaindata-provider"
import { ExternalLinkIcon, RocketIcon, XCircleIcon } from "@talismn/icons"
import { useAnyNetwork, useNetworkById, useTransaction } from "@ui/state"
import type {
  WalletTransaction,
  WalletTransactionDot,
  WalletTransactionEth,
  WalletTransactionSol,
} from "extension-core"
import { type FC, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, PillButton, ProcessAnimation, type ProcessAnimationStatus } from "talisman-ui"

import { TxReplaceDrawer } from "./TxReplaceDrawer"
import type { TxReplaceType } from "./types"

const getBlockExplorerUrl = (network: Network | undefined | null, hash: string) => {
  if (!network) return null
  return getBlockExplorerUrls(network, { type: "transaction", id: hash })[0] ?? null
}
export type ReplacementCallbackArgs = { txId: `0x${string}`; networkId: string }

type TxReplaceActionsProps = {
  tx: WalletTransaction
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

const TxReplaceActions: FC<TxReplaceActionsProps> = ({ tx, onReplacementComplete }) => {
  const { t } = useTranslation()
  const [replaceType, setReplaceType] = useState<TxReplaceType>()

  const handleShowDrawer = useCallback((type: TxReplaceType) => () => setReplaceType(type), [])

  const handleClose = useCallback(
    (newHash?: HexString) => {
      setReplaceType(undefined)
      if (newHash) {
        onReplacementComplete?.({ txId: newHash, networkId: tx.networkId })
      }
    },
    [onReplacementComplete, tx]
  )

  const evmNetwork = useNetworkById(tx.networkId, "ethereum")

  if (evmNetwork?.preserveGasEstimate) return null
  if (tx.status !== "pending" || tx.platform !== "ethereum") return null

  return (
    <>
      <div className="mt-8 flex w-full items-center justify-center gap-4">
        <PillButton
          size="sm"
          onClick={handleShowDrawer("speed-up")}
          icon={RocketIcon}
          className="!p-4"
        >
          {t("Speed Up")}
        </PillButton>
        <PillButton
          size="sm"
          onClick={handleShowDrawer("cancel")}
          icon={XCircleIcon}
          className="!p-4"
        >
          {t("Cancel Transaction")}
        </PillButton>
      </div>
      <TxReplaceDrawer tx={tx} type={replaceType} onClose={handleClose} />
    </>
  )
}

const useTxStatusDetails = (tx?: WalletTransaction) => {
  const { t } = useTranslation()
  const { title, subtitle, animStatus } = useMemo<{
    title: string
    subtitle: string
    animStatus: ProcessAnimationStatus
  }>(() => {
    // missing tx can occur while loading
    if (!tx)
      return {
        title: "",
        subtitle: "",
        animStatus: "processing",
      }

    const isReplacementCancel =
      tx.platform === "ethereum" &&
      tx.isReplacement &&
      tx.payload.value &&
      BigInt(tx.payload.value) === 0n

    switch (tx.status) {
      case "unknown":
        return {
          title: t("Transaction not found"),
          subtitle: t("Transaction was submitted, but Talisman is unable to track its progress."),
          animStatus: "failure",
        }
      case "replaced": {
        return {
          title: t("Transaction cancelled"),
          subtitle: t("This transaction has been replaced with another one"),
          animStatus: "failure",
        }
      }
      case "error":
        return {
          title: t("Failure"),
          subtitle: isReplacementCancel
            ? t("Failed to cancel transaction")
            : t("Transaction failed."),
          animStatus: "failure",
        }
      case "success":
        return {
          title: isReplacementCancel ? t("Transaction cancelled") : t("Success"),
          subtitle: isReplacementCancel
            ? t("Your transaction was cancelled")
            : t("Your transaction was successful!"),
          animStatus: isReplacementCancel ? "failure" : "success",
        }
      case "pending":
        return {
          title: isReplacementCancel ? t("Cancelling transaction") : t("Transaction in progress"),
          subtitle: isReplacementCancel
            ? t("Attempting to cancel transaction")
            : t("This may take a few minutes."),
          animStatus: "processing",
        }
    }
  }, [tx, t])

  return {
    title,
    subtitle,
    animStatus,
  }
}

type TxProgressBaseProps = {
  tx?: WalletTransaction
  className?: string
  blockNumber?: string
  onClose?: () => void
  href?: string | null
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

const TxProgressBase: FC<TxProgressBaseProps> = ({
  tx,
  blockNumber,
  href,
  onClose,
  onReplacementComplete,
}) => {
  const { t } = useTranslation()
  const { title, subtitle, animStatus } = useTxStatusDetails(tx)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className="mt-8 font-bold text-body text-lg">{title}</div>
      <div className="mt-12 text-center font-light text-base text-body-secondary">{subtitle}</div>
      <ProcessAnimation status={animStatus} className="mt-[7.5rem] mb-8 h-[14.5rem]" />
      <div className="flex w-full grow flex-col justify-center gap-10 px-10 text-center text-body-secondary">
        <div>
          {blockNumber ? (
            <>
              {tx?.confirmed ? t("Confirmed in") : t("Included in")}{" "}
              {href ? (
                <a target="_blank" className="text-grey-200 hover:text-body" href={href}>
                  {t("block #{{blockNumber}}", { blockNumber })}{" "}
                  <ExternalLinkIcon className="inline align-text-top" />
                </a>
              ) : (
                <span className="text-body">{t("block #{{blockNumber}}", { blockNumber })}</span>
              )}
            </>
          ) : href ? (
            <Trans t={t}>
              View transaction on{" "}
              <a target="_blank" className="text-grey-200 hover:text-body" href={href}>
                block explorer <ExternalLinkIcon className="inline align-text-top" />
              </a>
            </Trans>
          ) : null}
        </div>
        <div className="h-[3.6rem]">
          {tx?.status === "pending" && (
            <TxReplaceActions tx={tx} onReplacementComplete={onReplacementComplete} />
          )}
          {tx?.status === "success" && !tx?.confirmed && (
            <div className="h-[3.6rem] animate-pulse text-secondary">
              {t("You may close this window or wait for the transaction to be confirmed")}
            </div>
          )}
        </div>
      </div>
      <Button fullWidth onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}

type TxProgressDotProps = {
  tx: WalletTransactionDot
  onClose?: () => void
  className?: string
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

const TxProgressDot: FC<TxProgressDotProps> = ({
  tx,
  onClose,
  className,
  onReplacementComplete,
}) => {
  const chain = useNetworkById(tx.networkId)
  const href = useMemo(() => getBlockExplorerUrl(chain, tx.hash), [chain, tx.hash])

  return (
    <TxProgressBase
      tx={tx}
      className={className}
      onClose={onClose}
      blockNumber={tx.blockNumber}
      href={href}
      onReplacementComplete={onReplacementComplete}
    />
  )
}

type TxProgressEthProps = {
  tx: WalletTransactionEth
  onClose?: () => void
  className?: string
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

const TxProgressEth: FC<TxProgressEthProps> = ({
  tx,
  className,
  onClose,
  onReplacementComplete,
}) => {
  const network = useNetworkById(tx.networkId, "ethereum")
  const href = useMemo(() => getBlockExplorerUrl(network, tx.hash), [network, tx.hash])

  return (
    <TxProgressBase
      tx={tx}
      className={className}
      onClose={onClose}
      blockNumber={tx.blockNumber}
      href={href}
      onReplacementComplete={onReplacementComplete}
    />
  )
}

type TxProgressSolProps = {
  tx: WalletTransactionSol
  onClose?: () => void
  className?: string
}

const TxProgressSol: FC<TxProgressSolProps> = ({ tx, className, onClose }) => {
  const network = useNetworkById(tx.networkId, "ethereum")
  const href = useMemo(() => getBlockExplorerUrl(network, tx.signature), [network, tx.signature])

  return <TxProgressBase tx={tx} className={className} onClose={onClose} href={href} />
}

type TxProgressProps = {
  hash: string // hash or signature (for solana)
  networkIdOrHash: string
  onClose?: () => void
  className?: string
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

export const TxProgress: FC<TxProgressProps> = ({
  hash,
  networkIdOrHash,
  onClose,
  className,
  onReplacementComplete,
}) => {
  const tx = useTransaction(hash)
  const network = useAnyNetwork(networkIdOrHash)

  // tx is null if not found in db
  if (tx === null) {
    const href = getBlockExplorerUrl(network, hash)
    return (
      <TxProgressBase
        href={href}
        className={className}
        onClose={onClose}
        onReplacementComplete={onReplacementComplete}
      />
    )
  }

  switch (tx?.platform) {
    case "ethereum":
      return (
        <TxProgressEth
          tx={tx}
          onClose={onClose}
          className={className}
          onReplacementComplete={onReplacementComplete}
        />
      )
    case "polkadot":
      return (
        <TxProgressDot
          tx={tx}
          onClose={onClose}
          className={className}
          onReplacementComplete={onReplacementComplete}
        />
      )
    case "solana":
      return <TxProgressSol tx={tx} onClose={onClose} className={className} />
    default:
      return null
  }
}
