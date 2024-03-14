import { isAcalaEvmPlus } from "@extension/core"
import { EvmWalletTransaction, SubWalletTransaction, WalletTransaction } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { Chain, EvmNetwork } from "@talismn/chaindata-provider"
import { ExternalLinkIcon, RocketIcon, XCircleIcon } from "@talismn/icons"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useTransactionByHash from "@ui/hooks/useTransactionByHash"
import { FC, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, PillButton, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"
import urlJoin from "url-join"

import { TxReplaceDrawer, TxReplaceType } from "../Transactions"

const getBlockExplorerUrl = (
  network: EvmNetwork | undefined | null,
  chain: Chain | undefined | null,
  hash: string
) => {
  if (network?.explorerUrl) return urlJoin(network.explorerUrl, "tx", hash)
  if (chain?.subscanUrl) return urlJoin(chain.subscanUrl, "tx", hash)
  return undefined
}

const TxReplaceActions: FC<{ tx: WalletTransaction }> = ({ tx }) => {
  const { t } = useTranslation("send-funds")
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
    [gotoProgress, tx]
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
          {t("Cancel Transfer")}
        </PillButton>
      </div>
      <TxReplaceDrawer tx={tx} type={replaceType} onClose={handleClose} />
    </>
  )
}

const useStatusDetails = (tx?: WalletTransaction) => {
  const { t } = useTranslation("send-funds")
  const { title, subtitle, extra, animStatus } = useMemo<{
    title: string
    subtitle: string
    animStatus: ProcessAnimationStatus
    extra?: string
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
          extra: isReplacementCancel
            ? undefined
            : t("You can now close this window. Your transfer will continue in the background."),
          animStatus: "processing",
        }
    }
  }, [tx, t])

  return {
    title,
    subtitle,
    extra,
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
  const { t } = useTranslation("send-funds")
  const { title, subtitle, animStatus, extra } = useStatusDetails(tx)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className="text-body mt-32 text-lg font-bold">{title}</div>
      <div className="text-body-secondary mt-12 text-center text-base font-light">{subtitle}</div>
      <ProcessAnimation status={animStatus} className="mt-[7.5rem] h-[14.5rem]" />
      <div className="text-body-secondary flex w-full grow flex-col justify-center px-10 text-center ">
        <div>
          {blockNumber ? (
            <>
              {t("Included in")}{" "}
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
          ) : (
            extra
          )}
        </div>
        {tx?.status === "pending" && <TxReplaceActions tx={tx} />}
      </div>
      <Button fullWidth onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}

type SendFundsProgressSubstrateProps = {
  tx: SubWalletTransaction
  onClose?: () => void
  className?: string
}

const SendFundsProgressSubstrate: FC<SendFundsProgressSubstrateProps> = ({
  tx,
  onClose,
  className,
}) => {
  const chain = useChainByGenesisHash(tx.genesisHash)
  const href = useMemo(() => getBlockExplorerUrl(undefined, chain, tx.hash), [chain, tx.hash])

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

type SendFundsProgressEvmProps = {
  tx: EvmWalletTransaction
  onClose?: () => void
  className?: string
}

const SendFundsProgressProgressEvm: FC<SendFundsProgressEvmProps> = ({
  tx,
  className,
  onClose,
}) => {
  const network = useEvmNetwork(tx.evmNetworkId)
  const href = useMemo(() => getBlockExplorerUrl(network, undefined, tx.hash), [network, tx.hash])

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
  hash: HexString
  networkIdOrHash: string
  onClose?: () => void
  className?: string
}

export const SendFundsProgress: FC<SendFundsProgressProps> = ({
  hash,
  networkIdOrHash,
  onClose,
  className,
}) => {
  const tx = useTransactionByHash(hash)
  const evmNetwork = useEvmNetwork(networkIdOrHash)
  const chain = useChainByGenesisHash(networkIdOrHash)

  // tx is null if not found in db
  if (tx === null) {
    const href = getBlockExplorerUrl(evmNetwork, chain, hash)
    return <SendFundsProgressBase href={href} className={className} onClose={onClose} />
  }

  if (tx?.networkType === "substrate")
    return <SendFundsProgressSubstrate tx={tx} onClose={onClose} className={className} />

  if (tx?.networkType === "evm")
    return <SendFundsProgressProgressEvm tx={tx} onClose={onClose} className={className} />

  // render null while loading
  return null
}
