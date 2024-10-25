import { HexString } from "@polkadot/util/types"
import { Chain, EvmNetwork } from "@talismn/chaindata-provider"
import { ExternalLinkIcon, RocketIcon, XCircleIcon } from "@talismn/icons"
import { FC, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, PillButton, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"
import urlJoin from "url-join"

import {
  EvmWalletTransaction,
  isAcalaEvmPlus,
  SubWalletTransaction,
  WalletTransaction,
} from "@extension/core"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useChainByGenesisHash, useEvmNetwork, useTransaction } from "@ui/state"

import { TxReplaceDrawer } from "./TxReplaceDrawer"
import { TxReplaceType } from "./types"

const getBlockExplorerUrl = (
  network: EvmNetwork | undefined | null,
  chain: Chain | undefined | null,
  hash: string,
) => {
  if (network?.explorerUrl) return urlJoin(network.explorerUrl, "tx", hash)
  if (chain?.subscanUrl) return urlJoin(chain.subscanUrl, "tx", hash)
  return undefined
}

const TxReplaceActions: FC<{ tx: WalletTransaction }> = ({ tx }) => {
  const { t } = useTranslation()
  const [replaceType, setReplaceType] = useState<TxReplaceType>()
  const { gotoProgress } = useSendFundsWizard()

  const handleShowDrawer = useCallback((type: TxReplaceType) => () => setReplaceType(type), [])

  const handleClose = useCallback(
    (newHash?: HexString) => {
      setReplaceType(undefined)
      if (newHash) {
        const networkIdOrHash = tx.networkType === "evm" ? tx.evmNetworkId : tx.genesisHash
        if (networkIdOrHash) gotoProgress({ hash: newHash, networkIdOrHash })
      }
    },
    [gotoProgress, tx],
  )

  if (tx.networkType === "evm" && isAcalaEvmPlus(tx.evmNetworkId)) return null
  if (tx.status !== "pending" || tx.networkType !== "evm") return null

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
      tx.networkType === "evm" &&
      tx.isReplacement &&
      tx.unsigned.value &&
      BigInt(tx.unsigned.value) === 0n

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
  href?: string
}

const TxProgressBase: FC<TxProgressBaseProps> = ({ tx, blockNumber, href, onClose }) => {
  const { t } = useTranslation()
  const { title, subtitle, animStatus } = useTxStatusDetails(tx)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className="text-body mt-8 text-lg font-bold">{title}</div>
      <div className="text-body-secondary mt-12 text-center text-base font-light">{subtitle}</div>
      <ProcessAnimation status={animStatus} className="mb-8 mt-[7.5rem] h-[14.5rem]" />
      <div className="text-body-secondary flex w-full grow flex-col justify-center gap-10 px-10 text-center">
        <div>
          {blockNumber ? (
            <>
              {tx?.confirmed ? t("Confirmed in") : t("Included in")}{" "}
              {href ? (
                <a target="_blank" className="hover:text-body text-grey-200" href={href}>
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
              <a target="_blank" className="hover:text-body text-grey-200" href={href}>
                block explorer <ExternalLinkIcon className="inline align-text-top" />
              </a>
            </Trans>
          ) : null}
        </div>
        <div className="h-[3.6rem]">
          {tx?.status === "pending" && <TxReplaceActions tx={tx} />}
          {tx?.status === "success" && !tx?.confirmed && (
            <div className="text-secondary h-[3.6rem] animate-pulse">
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

type TxProgressSubstrateProps = {
  tx: SubWalletTransaction
  onClose?: () => void
  className?: string
}

const TxProgressSubstrate: FC<TxProgressSubstrateProps> = ({ tx, onClose, className }) => {
  const chain = useChainByGenesisHash(tx.genesisHash)
  const href = useMemo(() => getBlockExplorerUrl(undefined, chain, tx.hash), [chain, tx.hash])

  return (
    <TxProgressBase
      tx={tx}
      className={className}
      onClose={onClose}
      blockNumber={tx.blockNumber}
      href={href}
    />
  )
}

type TxProgressEvmProps = {
  tx: EvmWalletTransaction
  onClose?: () => void
  className?: string
}

const TxProgressEvm: FC<TxProgressEvmProps> = ({ tx, className, onClose }) => {
  const network = useEvmNetwork(tx.evmNetworkId)
  const href = useMemo(() => getBlockExplorerUrl(network, undefined, tx.hash), [network, tx.hash])

  return (
    <TxProgressBase
      tx={tx}
      className={className}
      onClose={onClose}
      blockNumber={tx.blockNumber}
      href={href}
    />
  )
}

type TxProgressProps = {
  hash: HexString
  networkIdOrHash: string
  onClose?: () => void
  className?: string
}

export const TxProgress: FC<TxProgressProps> = ({ hash, networkIdOrHash, onClose, className }) => {
  const tx = useTransaction(hash)
  const evmNetwork = useEvmNetwork(networkIdOrHash)
  const chain = useChainByGenesisHash(networkIdOrHash)

  // tx is null if not found in db
  if (tx === null) {
    const href = getBlockExplorerUrl(evmNetwork, chain, hash)
    return <TxProgressBase href={href} className={className} onClose={onClose} />
  }

  if (tx?.networkType === "substrate")
    return <TxProgressSubstrate tx={tx} onClose={onClose} className={className} />

  if (tx?.networkType === "evm")
    return <TxProgressEvm tx={tx} onClose={onClose} className={className} />

  // render null while loading
  return null
}
