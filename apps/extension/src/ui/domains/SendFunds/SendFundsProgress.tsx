import type {
  WalletTransaction,
  WalletTransactionDot,
  WalletTransactionEth,
  WalletTransactionSol,
} from "@core/domains/transactions/types"
import type { HexString } from "@polkadot/util/types"
import { getBlockExplorerUrls, type Network } from "@talismn/chaindata-provider"
import { ExternalLinkIcon, RocketIcon, XCircleIcon } from "@talismn/icons"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAnyNetwork, useNetworkById } from "@ui/state/chaindata"
import { useTransaction } from "@ui/state/transactions"
import { Button } from "@ui/talisman-ui/components/Button"
import { PillButton } from "@ui/talisman-ui/components/PillButton"
import {
  ProcessAnimation,
  type ProcessAnimationStatus,
} from "@ui/talisman-ui/components/ProcessAnimation/ProcessAnimation"
import { type FC, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TxReplaceDrawer, type TxReplaceType } from "../Transactions"

const getBlockExplorerUrl = (network: Network | undefined | null, hash: string) => {
  return getBlockExplorerUrls(network!, { type: "transaction", id: hash })[0] ?? null
}

const TxReplaceActions: FC<{ tx: WalletTransaction }> = ({ tx }) => {
  const { t } = useTranslation()
  const [replaceType, setReplaceType] = useState<TxReplaceType>()
  const { gotoProgress } = useSendFundsWizard()
  const network = useNetworkById(tx.networkId, "ethereum")

  const handleShowDrawer = useCallback((type: TxReplaceType) => () => setReplaceType(type), [])

  const handleClose = useCallback(
    (newHash?: HexString) => {
      setReplaceType(undefined)
      if (newHash && network) {
        gotoProgress({ txId: newHash, networkId: network.id })
      }
    },
    [gotoProgress, network]
  )

  if (!network) return null
  if (tx.status !== "pending") return null
  if (network?.preserveGasEstimate) return null

  return (
    <>
      <div className="flex w-full items-center justify-center gap-4">
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
          {t("Cancel Transfer")}
        </PillButton>
      </div>
      <TxReplaceDrawer tx={tx} type={replaceType} onClose={handleClose} />
    </>
  )
}

const useStatusDetails = (tx?: WalletTransaction) => {
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
          subtitle: isReplacementCancel ? t("Failed to cancel transfer") : t("Transaction failed."),
          animStatus: "failure",
        }
      case "success":
        return {
          title: isReplacementCancel ? t("Transaction cancelled") : t("Success"),
          subtitle: isReplacementCancel
            ? t("Your transfer was cancelled")
            : t("Your transfer was successful!"),
          animStatus: isReplacementCancel ? "failure" : "success",
        }
      case "pending":
        return {
          title: isReplacementCancel ? t("Cancelling transaction") : t("Transfer in progress"),
          subtitle: isReplacementCancel
            ? t("Attempting to cancel transfer")
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

type SendFundsProgressBaseProps = {
  tx?: WalletTransaction
  className?: string
  blockNumber?: string
  onClose?: () => void
  href?: string
}

const SendFundsProgressBase: FC<SendFundsProgressBaseProps> = ({
  tx,
  blockNumber,
  href,
  onClose,
}) => {
  const { t } = useTranslation()
  const { title, subtitle, animStatus } = useStatusDetails(tx)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className="mt-32 font-bold text-body text-lg">{title}</div>
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
          {tx?.status === "pending" && <TxReplaceActions tx={tx} />}
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

type SendFundsProgressSubstrateProps = {
  tx: WalletTransactionDot
  onClose?: () => void
  className?: string
}

const SendFundsProgressSubstrate: FC<SendFundsProgressSubstrateProps> = ({
  tx,
  onClose,
  className,
}) => {
  const chain = useNetworkById(tx.networkId)
  const href = useMemo(() => getBlockExplorerUrl(chain, tx.hash), [chain, tx.hash])

  return (
    <SendFundsProgressBase
      tx={tx}
      className={className}
      onClose={onClose}
      blockNumber={tx.blockNumber}
      href={href}
    />
  )
}

type SendFundsProgressSolanaProps = {
  tx: WalletTransactionSol
  onClose?: () => void
  className?: string
}

const SendFundsProgressSolana: FC<SendFundsProgressSolanaProps> = ({ tx, onClose, className }) => {
  const network = useNetworkById(tx.networkId, "solana")
  const href = useMemo(
    () =>
      network
        ? getBlockExplorerUrls(network, {
            type: "transaction",
            id: tx.signature,
          })[0]
        : undefined,
    [network, tx.signature]
  )

  return <SendFundsProgressBase tx={tx} className={className} onClose={onClose} href={href} />
}

type SendFundsProgressEvmProps = {
  tx: WalletTransactionEth
  onClose?: () => void
  className?: string
}

const SendFundsProgressProgressEvm: FC<SendFundsProgressEvmProps> = ({
  tx,
  className,
  onClose,
}) => {
  const network = useNetworkById(tx.networkId, "ethereum")
  const href = useMemo(() => getBlockExplorerUrl(network, tx.hash), [network, tx.hash])

  return (
    <SendFundsProgressBase
      tx={tx}
      className={className}
      onClose={onClose}
      blockNumber={tx.blockNumber}
      href={href}
    />
  )
}

type SendFundsProgressProps = {
  txId: string
  networkId: string
  onClose?: () => void
  className?: string
}

export const SendFundsProgress: FC<SendFundsProgressProps> = ({
  txId,
  networkId,
  onClose,
  className,
}) => {
  const tx = useTransaction(txId)
  const network = useAnyNetwork(networkId)

  // tx is null if not found in db
  if (tx === null) {
    const href = getBlockExplorerUrl(network, txId)
    return <SendFundsProgressBase href={href} className={className} onClose={onClose} />
  }

  switch (tx?.platform) {
    case "ethereum":
      return <SendFundsProgressProgressEvm tx={tx} onClose={onClose} className={className} />
    case "polkadot":
      return <SendFundsProgressSubstrate tx={tx} onClose={onClose} className={className} />
    case "solana":
      return <SendFundsProgressSolana tx={tx} onClose={onClose} className={className} />
  }

  return null
}
