import type {
  WalletTransaction,
  WalletTransactionBtc,
  WalletTransactionDot,
  WalletTransactionEth,
  WalletTransactionSol,
} from "@core/domains/transactions/types"
import { getBlockExplorerUrl } from "@talismn/chaindata-provider"
import { ExternalLinkIcon, RocketIcon, XCircleIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import {
  ProcessAnimation,
  type ProcessAnimationStatus,
} from "@ui/components/ProcessAnimation/ProcessAnimation"
import { useAnyNetwork, useNetworkById } from "@ui/state/chaindata"
import { useTransaction } from "@ui/state/transactions"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { TxReplaceDrawer } from "./TxReplaceDrawer"
import type { TxReplaceType } from "./types"

/** "transfer" words the send funds flow */
export type TxProgressWording = "transaction" | "transfer"

// txId is an evm tx hash or a bitcoin txid, hence the loose type
export type ReplacementCallbackArgs = {
  txId: string
  networkId: string
  replaceType: TxReplaceType
}

type TxReplaceActionsProps = {
  wording?: TxProgressWording
  tx: WalletTransaction | null | undefined
  className?: string
  containerId?: string
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

export const TxReplaceActions: FC<TxReplaceActionsProps> = ({
  tx,
  wording = "transaction",
  className,
  containerId,
  onReplacementComplete,
}) => {
  const { t } = useTranslation()
  const [replaceType, setReplaceType] = useState<TxReplaceType>()

  const handleShowDrawer = useCallback((type: TxReplaceType) => () => setReplaceType(type), [])

  const handleClose = useCallback(
    (newHash?: string) => {
      setReplaceType(undefined)
      if (newHash && replaceType && tx) {
        onReplacementComplete?.({ txId: newHash, networkId: tx.networkId, replaceType })
      }
    },
    [onReplacementComplete, tx, replaceType]
  )

  const evmNetwork = useNetworkById(tx?.networkId, "ethereum")

  const isInvisible = useMemo(() => {
    if (!tx) return true
    if (tx.platform === "ethereum" && (!evmNetwork || evmNetwork.preserveGasEstimate)) return true
    if (tx.status !== "pending" || (tx.platform !== "ethereum" && tx.platform !== "bitcoin"))
      return true
    return false
  }, [tx, evmNetwork])

  return (
    <>
      <div
        className={cn(
          "mt-8 flex w-full items-center justify-center gap-4",
          className,
          isInvisible && "invisible"
        )}
      >
        <PillButton
          size="sm"
          onClick={handleShowDrawer("speed-up")}
          icon={RocketIcon}
          className="p-4!"
        >
          {t("Speed Up")}
        </PillButton>
        <PillButton
          size="sm"
          onClick={handleShowDrawer("cancel")}
          icon={XCircleIcon}
          className="p-4!"
        >
          {wording === "transfer" ? t("Cancel Transfer") : t("Cancel Transaction")}
        </PillButton>
      </div>
      {!!tx && (
        <TxReplaceDrawer
          tx={tx}
          type={replaceType}
          containerId={containerId}
          onClose={handleClose}
        />
      )}
    </>
  )
}

const useTxStatusDetails = (tx: WalletTransaction | undefined, wording: TxProgressWording) => {
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
            ? wording === "transfer"
              ? t("Failed to cancel transfer")
              : t("Failed to cancel transaction")
            : t("Transaction failed."),
          animStatus: "failure",
        }
      case "success":
        return {
          title: isReplacementCancel ? t("Transaction cancelled") : t("Success"),
          subtitle:
            wording === "transfer"
              ? isReplacementCancel
                ? t("Your transfer was cancelled")
                : t("Your transfer was successful!")
              : isReplacementCancel
                ? t("Your transaction was cancelled")
                : t("Your transaction was successful!"),
          animStatus: isReplacementCancel ? "failure" : "success",
        }
      case "pending":
        return {
          title: isReplacementCancel
            ? t("Cancelling transaction")
            : wording === "transfer"
              ? t("Transfer in progress")
              : t("Transaction in progress"),
          subtitle: isReplacementCancel
            ? wording === "transfer"
              ? t("Attempting to cancel transfer")
              : t("Attempting to cancel transaction")
            : t("This may take a few minutes."),
          animStatus: "processing",
        }
    }
  }, [tx, t, wording])

  return {
    title,
    subtitle,
    animStatus,
  }
}

type TxProgressBaseProps = {
  tx?: WalletTransaction
  wording?: TxProgressWording
  className?: string
  blockNumber?: string
  onClose?: () => void
  href?: string | null
  containerId?: string
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

const TxProgressBase: FC<TxProgressBaseProps> = ({
  tx,
  wording = "transaction",
  className,
  blockNumber,
  href,
  onClose,
  containerId,
  onReplacementComplete,
}) => {
  const { t } = useTranslation()
  const { title, subtitle, animStatus } = useTxStatusDetails(tx, wording)

  return (
    <div className={cn("flex h-full w-full flex-col items-center", className)}>
      <div className="mt-8 font-bold text-body text-lg">{title}</div>
      <div className="mt-12 text-center font-light text-base text-body-secondary">{subtitle}</div>
      <ProcessAnimation status={animStatus} className="mt-18.75 mb-8 h-36.25" />
      <div className="flex w-full grow flex-col justify-center gap-10 px-10 text-center text-body-secondary">
        <div>
          {blockNumber ? (
            <>
              {tx?.confirmed ? t("Confirmed in") : t("Included in")}{" "}
              {href ? (
                <a
                  target="_blank"
                  className="text-grey-200 hover:text-body"
                  href={href}
                  rel="noopener"
                >
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
              <a
                target="_blank"
                className="text-grey-200 hover:text-body"
                href={href}
                rel="noopener"
              >
                block explorer <ExternalLinkIcon className="inline align-text-top" />
              </a>
            </Trans>
          ) : null}
        </div>
        <div className="h-[2.25rem]">
          {tx?.status === "pending" && (
            <TxReplaceActions
              tx={tx}
              wording={wording}
              containerId={containerId}
              onReplacementComplete={onReplacementComplete}
            />
          )}
          {tx?.status === "success" && !tx?.confirmed && (
            <div className="h-[2.25rem] animate-pulse text-secondary">
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

type TxProgressOptions = {
  onClose?: () => void
  className?: string
  containerId?: string
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
  wording?: TxProgressWording
}

const TxProgressDot: FC<TxProgressOptions & { tx: WalletTransactionDot }> = ({
  tx,
  ...options
}) => {
  const chain = useNetworkById(tx.networkId)
  const href = useMemo(
    () => getBlockExplorerUrl(chain, { type: "transaction", id: tx.hash }),
    [chain, tx.hash]
  )

  return <TxProgressBase {...options} tx={tx} blockNumber={tx.blockNumber} href={href} />
}

const TxProgressEth: FC<TxProgressOptions & { tx: WalletTransactionEth }> = ({
  tx,
  ...options
}) => {
  const network = useNetworkById(tx.networkId, "ethereum")
  const href = useMemo(
    () => getBlockExplorerUrl(network, { type: "transaction", id: tx.hash }),
    [network, tx.hash]
  )

  return <TxProgressBase {...options} tx={tx} blockNumber={tx.blockNumber} href={href} />
}

const TxProgressSol: FC<TxProgressOptions & { tx: WalletTransactionSol }> = ({
  tx,
  ...options
}) => {
  const network = useNetworkById(tx.networkId, "solana")
  const href = useMemo(
    () => getBlockExplorerUrl(network, { type: "transaction", id: tx.signature }),
    [network, tx.signature]
  )

  return <TxProgressBase {...options} tx={tx} href={href} />
}

const TxProgressBtc: FC<TxProgressOptions & { tx: WalletTransactionBtc }> = ({
  tx,
  ...options
}) => {
  const network = useNetworkById(tx.networkId, "bitcoin")
  const href = useMemo(
    () => getBlockExplorerUrl(network, { type: "transaction", id: tx.hash }),
    [network, tx.hash]
  )

  return <TxProgressBase {...options} tx={tx} blockNumber={tx.blockNumber} href={href} />
}

type TxProgressProps = TxProgressOptions & {
  hash: string // hash or signature (for solana)
  networkIdOrHash: string
}

export const TxProgress: FC<TxProgressProps> = ({ hash, networkIdOrHash, ...options }) => {
  const tx = useTransaction(hash)
  const network = useAnyNetwork(networkIdOrHash)

  // tx is null if not found in db
  if (tx === null) {
    const href = getBlockExplorerUrl(network, { type: "transaction", id: hash })
    return <TxProgressBase {...options} href={href} />
  }

  switch (tx?.platform) {
    case "ethereum":
      return <TxProgressEth {...options} tx={tx} />
    case "polkadot":
      return <TxProgressDot {...options} tx={tx} />
    case "solana":
      return <TxProgressSol {...options} tx={tx} />
    case "bitcoin":
      return <TxProgressBtc {...options} tx={tx} />
    default:
      return null
  }
}
