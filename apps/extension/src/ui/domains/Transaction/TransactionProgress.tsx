import { TransactionStatus } from "@core/domains/transactions/types"
import Link from "@ui/domains/Transaction/Link"
import useChain from "@ui/hooks/useChain"
import { useEvmTransactionWatch } from "@ui/hooks/useEvmTransactionWatch"
import useTransactionById from "@ui/hooks/useTransactionById"
import { FC, useCallback, useMemo } from "react"
import { Button, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"

type DetailsDisplayProps = {
  className?: string
  blockHash?: string
  blockNumber?: string
  status: TransactionStatus
  message?: string
  handleClose?: () => void
  href?: string
}

type StatusDetails = {
  title: string
  subtitle: string
  animStatus: ProcessAnimationStatus
}

const getStatusDetails = (status: TransactionStatus): StatusDetails => {
  switch (status) {
    case "ERROR":
      return {
        title: "Failure",
        subtitle: "Transaction was not found",
        animStatus: "failure",
      }
    case "SUCCESS":
      return {
        title: "Success",
        subtitle: "Your transaction was successful",
        animStatus: "success",
      }
    case "PENDING":
    default:
      return {
        title: "Transaction in progress",
        subtitle: "This may take a few minutes",
        animStatus: "processing",
      }
  }
}

export const DetailDisplay = ({
  status,
  message,
  blockHash,
  blockNumber,
  href,
  handleClose,
  className,
}: DetailsDisplayProps) => {
  const { title, subtitle, animStatus } = useMemo(() => getStatusDetails(status), [status])

  const handleViewTx = useCallback(() => {
    window.open(href, "_blank")
    handleClose?.()
  }, [handleClose, href])

  const showLink = status === "PENDING" && blockHash
  const showViewTx = status === "SUCCESS" && href
  const showClose = status !== "PENDING" && !showViewTx

  return (
    <div className=" flex h-full w-full flex-col">
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

type DetailSubstrateProps = {
  substrateTxId: string
  handleClose?: () => void
  className?: string
}

const DetailSubstrate = (props: DetailSubstrateProps) => {
  const { chainId, blockHash, blockNumber, extrinsicIndex, message, status } = useTransactionById(
    props.substrateTxId
  )
  const { subscanUrl } = useChain(chainId) || {}

  const href = useMemo(() => {
    if (!subscanUrl || !blockHash) return undefined
    if (!blockNumber || typeof extrinsicIndex !== "number") return `${subscanUrl}block/${blockHash}`
    return `${subscanUrl}extrinsic/${blockNumber}-${extrinsicIndex}`
  }, [blockHash, blockNumber, extrinsicIndex, subscanUrl])

  return (
    <DetailDisplay
      {...props}
      status={status}
      message={message}
      blockHash={blockHash}
      blockNumber={blockNumber}
      href={href}
    />
  )
}

type DetailEvmProps = {
  evmNetworkId: number
  evmTxHash: string
  handleClose?: () => void
  className?: string
}

const DetailEvm = (props: DetailEvmProps) => {
  const { blockHash, blockNumber, message, status, href } = useEvmTransactionWatch(
    props.evmNetworkId,
    props.evmTxHash
  )

  return (
    <DetailDisplay
      {...props}
      status={status}
      message={message}
      blockHash={blockHash}
      blockNumber={blockNumber}
      href={href}
    />
  )
}

type TransactionProgressProps = {
  substrateTxId?: string
  evmNetworkId?: number
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
      <DetailSubstrate
        substrateTxId={substrateTxId}
        handleClose={handleClose}
        className={className}
      />
    )

  if (evmNetworkId && evmTxHash)
    return (
      <DetailEvm
        evmNetworkId={evmNetworkId}
        evmTxHash={evmTxHash}
        handleClose={handleClose}
        className={className}
      />
    )

  return null
}
