import {
  EvmWalletTransaction,
  SubWalletTransaction,
  TransactionStatus,
} from "@core/domains/transactions"
import { HexString } from "@polkadot/util/types"
import { IconButton } from "@talisman/components/IconButton"
import { XIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import Link from "@ui/domains/Transaction/Link"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useTransactionByHash from "@ui/hooks/useTransactionByHash"
import { FC, useCallback, useMemo } from "react"
import { Button, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"
import urlJoin from "url-join"

const getAnimStatus = (status: TransactionStatus): ProcessAnimationStatus => {
  switch (status) {
    case "error":
    case "replaced":
    case "unknown":
      return "failure"
    case "success":
      return "success"
    case "pending":
      return "processing"
  }
}

const useStatusDetails = (
  status: TransactionStatus,
  blockNumber?: string,
  href?: string,
  onClose?: () => void
) => {
  const handleViewTx = useCallback(() => {
    window.open(href, "_blank")
    onClose?.()
  }, [onClose, href])

  const { title, subtitle } = useMemo(() => {
    switch (status) {
      case "unknown":
      case "error":
        return {
          title: "Failure",
          subtitle: "Transaction was not found",
        }
      case "success":
        return {
          title: "Success",
          subtitle: "Your transaction was successful",
        }
      case "pending":
        return {
          title: "Transaction in progress",
          subtitle: "This may take a few minutes",
        }
      case "replaced": {
        return {
          title: "Transaction cancelled",
          subtitle: "This transaction has been replaced with another one",
        }
      }
    }
  }, [status])

  const { canClose, animStatus, showLink, showClose, showViewTx } = useMemo(() => {
    const canClose = status !== "pending"
    const showViewTx = status === "success" && !!href
    return {
      canClose,
      animStatus: getAnimStatus(status),
      showLink: status === "pending" && blockNumber !== undefined,
      showClose: canClose && !showViewTx,
      showViewTx,
    }
  }, [blockNumber, href, status])

  return {
    title,
    subtitle,
    animStatus,
    handleViewTx,
    showLink,
    showViewTx,
    canClose,
    showClose,
  }
}

type TransactionProgressBaseProps = {
  className?: string
  blockNumber?: string
  status: TransactionStatus
  onClose?: () => void
  href?: string
}

const TransactionProgressBase: FC<TransactionProgressBaseProps> = ({
  status,
  blockNumber,
  href,
  onClose,
}) => {
  const { title, subtitle, animStatus, canClose, showClose, showLink, showViewTx, handleViewTx } =
    useStatusDetails(status, blockNumber, href, onClose)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className={classNames("flex w-full justify-end", canClose ? "visible" : "invisible")}>
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="text-body my-12 text-lg font-bold">{title}</div>
      <div className="text-body-secondary text-base font-light">{subtitle}</div>
      <div className="flex grow flex-col justify-center">
        <ProcessAnimation status={animStatus} className="h-[14.5rem]" />
      </div>
      <div className="flex h-28 w-full flex-col justify-center">
        {showLink && <Link prefix="Included in" blockNumber={blockNumber} href={href} />}
        {showViewTx && (
          <Button fullWidth onClick={handleViewTx}>
            View Transaction
          </Button>
        )}
        {showClose && (
          <Button fullWidth onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  )
}

type TransactionProgressSubstrateProps = {
  tx: SubWalletTransaction
  onClose?: () => void
  className?: string
}

const TransactionProgressSubstrate: FC<TransactionProgressSubstrateProps> = ({
  tx,
  onClose,
  className,
}) => {
  const chain = useChainByGenesisHash(tx.genesisHash)
  const href = useMemo(() => {
    return chain?.subscanUrl ? urlJoin(chain.subscanUrl, "tx", tx.hash) : undefined
  }, [chain, tx])

  return (
    <TransactionProgressBase
      className={className}
      onClose={onClose}
      status={tx.status}
      blockNumber={tx.blockNumber}
      href={href}
    />
  )
}

type TransactionProgressEvmProps = {
  tx: EvmWalletTransaction
  onClose?: () => void
  className?: string
}

const TransactionProgressEvm: FC<TransactionProgressEvmProps> = ({ tx, className, onClose }) => {
  const network = useEvmNetwork(tx.evmNetworkId)

  const href = useMemo(
    () => (network?.explorerUrl ? urlJoin(network.explorerUrl, "tx", tx.hash) : undefined),
    [network?.explorerUrl, tx.hash]
  )

  return (
    <TransactionProgressBase
      className={className}
      onClose={onClose}
      status={tx.status}
      blockNumber={tx.blockNumber}
      href={href}
    />
  )
}

type TransactionProgressProps = {
  hash?: HexString
  onClose?: () => void
  className?: string
}

export const TransactionProgress: FC<TransactionProgressProps> = ({ hash, onClose, className }) => {
  const tx = useTransactionByHash(hash)

  if (tx?.networkType === "substrate")
    return <TransactionProgressSubstrate tx={tx} onClose={onClose} className={className} />

  if (tx?.networkType === "evm")
    return <TransactionProgressEvm tx={tx} onClose={onClose} className={className} />

  return null
}
