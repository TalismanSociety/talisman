import { EvmNetworkId } from "@core/domains/ethereum/types"
import { TransactionStatus } from "@core/domains/transactions/types"
import { IconButton } from "@talisman/components/IconButton"
import { XIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import Link from "@ui/domains/Transaction/Link"
import useChain from "@ui/hooks/useChain"
import { useEvmTransactionWatch } from "@ui/hooks/useEvmTransactionWatch"
import useTransactionById from "@ui/hooks/useTransactionById"
import { FC, useCallback, useMemo } from "react"
import { Button, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"

const getAnimStatus = (status: TransactionStatus): ProcessAnimationStatus => {
  switch (status) {
    case "ERROR":
      return "failure"
    case "SUCCESS":
      return "success"
    case "PENDING":
      return "processing"
  }
}

const useStatusDetails = (
  status: TransactionStatus,
  blockHash?: string,
  href?: string,
  handleClose?: () => void
) => {
  const handleViewTx = useCallback(() => {
    window.open(href, "_blank")
    handleClose?.()
  }, [handleClose, href])

  const { title, subtitle } = useMemo(() => {
    switch (status) {
      case "ERROR":
        return {
          title: "Failure",
          subtitle: "Transaction was not found",
        }
      case "SUCCESS":
        return {
          title: "Success",
          subtitle: "Your transaction was successful",
        }
      case "PENDING":
      default:
        return {
          title: "Transaction in progress",
          subtitle: "This may take a few minutes",
        }
    }
  }, [status])

  const { canClose, animStatus, showLink, showClose, showViewTx } = useMemo(() => {
    const canClose = status !== "PENDING"
    const showViewTx = status === "SUCCESS" && !!href
    return {
      canClose,
      animStatus: getAnimStatus(status),
      showLink: status === "PENDING" && !!blockHash,
      showClose: canClose && !showViewTx,
      showViewTx,
    }
  }, [blockHash, href, status])

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
  blockHash?: string
  blockNumber?: string
  status: TransactionStatus
  handleClose?: () => void
  href?: string
}

const TransactionProgressBase: FC<TransactionProgressBaseProps> = ({
  status,
  blockHash,
  blockNumber,
  href,
  handleClose,
}) => {
  const { title, subtitle, animStatus, canClose, showClose, showLink, showViewTx, handleViewTx } =
    useStatusDetails(status, blockHash, href, handleClose)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className={classNames("flex w-full justify-end", canClose ? "visible" : "invisible")}>
        <IconButton onClick={handleClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="text-body my-12 text-lg font-bold">{title}</div>
      <div className="text-body-secondary text-base font-light">{subtitle}</div>
      <div className="flex grow flex-col justify-center">
        <ProcessAnimation status={animStatus} className="h-[14.5rem]" />
      </div>
      <div className="flex h-28 w-full flex-col justify-center">
        {showLink && (
          <Link prefix="Included in" blockHash={blockHash} blockNumber={blockNumber} href={href} />
        )}
        {showViewTx && (
          <Button fullWidth onClick={handleViewTx}>
            View Transaction
          </Button>
        )}
        {showClose && (
          <Button fullWidth onClick={handleClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  )
}

type TransactionProgressSubstrateProps = {
  substrateTxId: string
  handleClose?: () => void
  className?: string
}

const TransactionProgressSubstrate: FC<TransactionProgressSubstrateProps> = (props) => {
  const { chainId, blockHash, blockNumber, extrinsicIndex, status } = useTransactionById(
    props.substrateTxId
  )
  const { subscanUrl } = useChain(chainId) || {}

  const href = useMemo(() => {
    if (!subscanUrl || !blockHash) return undefined
    if (!blockNumber || typeof extrinsicIndex !== "number") return `${subscanUrl}block/${blockHash}`
    return `${subscanUrl}extrinsic/${blockNumber}-${extrinsicIndex}`
  }, [blockHash, blockNumber, extrinsicIndex, subscanUrl])

  return (
    <TransactionProgressBase
      {...props}
      status={status}
      blockHash={blockHash}
      blockNumber={blockNumber}
      href={href}
    />
  )
}

type TransactionProgressEvmProps = {
  evmNetworkId: EvmNetworkId
  evmTxHash: string
  handleClose?: () => void
  className?: string
}

const TransactionProgressEvm: FC<TransactionProgressEvmProps> = (props) => {
  const { blockHash, blockNumber, status, href } = useEvmTransactionWatch(
    props.evmNetworkId,
    props.evmTxHash
  )

  return (
    <TransactionProgressBase
      {...props}
      status={status}
      blockHash={blockHash}
      blockNumber={blockNumber}
      href={href}
    />
  )
}

type TransactionProgressProps = {
  substrateTxId?: string
  evmNetworkId?: EvmNetworkId
  evmTxHash?: string
  handleClose?: () => void
  className?: string
}

export const TransactionProgress: FC<TransactionProgressProps> = ({
  substrateTxId,
  evmNetworkId,
  evmTxHash,
  handleClose,
  className,
}) => {
  if (substrateTxId)
    return (
      <TransactionProgressSubstrate
        substrateTxId={substrateTxId}
        handleClose={handleClose}
        className={className}
      />
    )

  if (evmNetworkId && evmTxHash)
    return (
      <TransactionProgressEvm
        evmNetworkId={evmNetworkId}
        evmTxHash={evmTxHash}
        handleClose={handleClose}
        className={className}
      />
    )

  return null
}
