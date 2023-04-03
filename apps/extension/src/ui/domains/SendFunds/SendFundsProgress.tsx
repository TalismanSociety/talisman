import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/transactions"
import { HexString } from "@polkadot/util/types"
import { ExternalLinkIcon, RocketIcon, XCircleIcon } from "@talisman/theme/icons"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useTransactionByHash from "@ui/hooks/useTransactionByHash"
import { ethers } from "ethers"
import { FC, useCallback, useMemo, useState } from "react"
import { Button, PillButton, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"
import urlJoin from "url-join"

import { TxReplaceDrawer, TxReplaceType } from "../Transactions"

const TxReplaceActions: FC<{ tx: WalletTransaction }> = ({ tx }) => {
  const [replaceType, setReplaceType] = useState<TxReplaceType>()
  const { gotoProgress } = useSendFundsWizard()

  const handleShowDrawer = useCallback((type: TxReplaceType) => () => setReplaceType(type), [])

  const handleClose = useCallback(
    (newHash?: HexString) => {
      setReplaceType(undefined)
      if (newHash) gotoProgress({ hash: newHash })
    },
    [gotoProgress]
  )

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
          Speed Up
        </PillButton>
        <PillButton
          size="sm"
          onClick={handleShowDrawer("cancel")}
          icon={XCircleIcon}
          className="!p-4"
        >
          Cancel Transfer
        </PillButton>
      </div>
      <TxReplaceDrawer tx={tx} type={replaceType} isOpen={!!replaceType} onClose={handleClose} />
    </>
  )
}

const useStatusDetails = (tx: WalletTransaction) => {
  const { title, subtitle, extra, animStatus } = useMemo<{
    title: string
    subtitle: string
    animStatus: ProcessAnimationStatus
    extra?: string
  }>(() => {
    const isReplacementCancel =
      tx.networkType === "evm" &&
      tx.isReplacement &&
      tx.unsigned.value &&
      ethers.BigNumber.from(tx.unsigned.value).isZero()

    switch (tx.status) {
      case "unknown":
        return {
          title: "Failure",
          subtitle: "Transaction was not found.",
          animStatus: "failure",
        }
      case "replaced": {
        return {
          title: "Transaction cancelled",
          subtitle: "This transaction has been replaced with another one",
          animStatus: "failure",
        }
      }
      case "error":
        return {
          title: "Failure",
          subtitle: "Transaction failed.",
          animStatus: "failure",
        }
      case "success":
        return {
          title: isReplacementCancel ? "Transaction cancelled" : "Success",
          subtitle: isReplacementCancel
            ? "Your transfer was cancelled"
            : "Your transfer was successful!",
          animStatus: isReplacementCancel ? "failure" : "success",
        }
      case "pending":
        return {
          title: "Transfer in progress",
          subtitle: "This may take a few minutes.",
          extra: "You can now close this window. Your transfer will continue in the background.",
          animStatus: "processing",
        }
    }
  }, [tx])

  return {
    title,
    subtitle,
    extra,
    animStatus,
  }
}

type SendFundsProgressBaseProps = {
  tx: WalletTransaction
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
  const { title, subtitle, animStatus, extra } = useStatusDetails(tx)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className="text-body mt-32 text-lg font-bold">{title}</div>
      <div className="text-body-secondary mt-12 text-center text-base font-light">{subtitle}</div>
      {/* <div className="flex grow flex-col justify-center"> */}
      <ProcessAnimation status={animStatus} className="mt-[7.5rem] h-[14.5rem]" />
      {/* </div> */}
      <div className="text-body-secondary flex w-full grow flex-col justify-center px-10 text-center ">
        <div>
          {blockNumber ? (
            <>
              Included in{" "}
              {href ? (
                <a target="_blank" className="hover:text-body text-grey-200" href={href}>
                  block #{blockNumber} <ExternalLinkIcon className="inline align-text-top" />
                </a>
              ) : (
                <span className="text-body">block #{blockNumber}</span>
              )}
            </>
          ) : href ? (
            <>
              View transaction on{" "}
              <a target="_blank" className="hover:text-body text-grey-200" href={href}>
                block explorer <ExternalLinkIcon className="inline align-text-top" />
              </a>
            </>
          ) : (
            extra
          )}
        </div>
        {tx.status === "pending" && <TxReplaceActions tx={tx} />}
      </div>
      <Button fullWidth onClick={onClose}>
        Close
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
  const href = useMemo(() => {
    return chain?.subscanUrl ? urlJoin(chain.subscanUrl, "tx", tx.hash) : undefined
  }, [chain, tx])

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

  const href = useMemo(
    () => (network?.explorerUrl ? urlJoin(network.explorerUrl, "tx", tx.hash) : undefined),
    [network?.explorerUrl, tx.hash]
  )
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
  onClose?: () => void
  className?: string
}

export const SendFundsProgress: FC<SendFundsProgressProps> = ({ hash, onClose, className }) => {
  const tx = useTransactionByHash(hash)

  if (tx?.networkType === "substrate")
    return <SendFundsProgressSubstrate tx={tx} onClose={onClose} className={className} />

  if (tx?.networkType === "evm")
    return <SendFundsProgressProgressEvm tx={tx} onClose={onClose} className={className} />

  return null
}
