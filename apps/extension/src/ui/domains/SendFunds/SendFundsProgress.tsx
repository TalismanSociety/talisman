import { EvmNetworkId } from "@core/domains/ethereum/types"
import { TransactionStatus } from "@core/domains/transactions/types"
import useChain from "@ui/hooks/useChain"
import { useEvmTransactionWatch } from "@ui/hooks/useEvmTransactionWatch"
import useTransactionById from "@ui/hooks/useTransactionById"
import { FC, useMemo } from "react"
import { Button, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"

const useStatusDetails = (status: TransactionStatus) => {
  const { title, subtitle, extra, animStatus } = useMemo<{
    title: string
    subtitle: string
    animStatus: ProcessAnimationStatus
    extra?: string
  }>(() => {
    switch (status) {
      case "ERROR":
        return {
          title: "Failure",
          subtitle: "Transaction failed.",
          animStatus: "failure",
        }
      case "SUCCESS":
        return {
          title: "Success",
          subtitle: "Your transfer was successful!",
          animStatus: "success",
        }
      case "PENDING":
      default:
        return {
          title: "Transfer in progress",
          subtitle: "This may take a few minutes.",
          extra: "You can close this window while your transfer will continue.",
          animStatus: "processing",
        }
    }
  }, [status])

  return {
    title,
    subtitle,
    extra,
    animStatus,
  }
}

type SendFundsProgressBaseProps = {
  className?: string
  blockHash?: string
  blockNumber?: string
  status: TransactionStatus
  onClose?: () => void
  href?: string
}

const SendFundsProgressBase: FC<SendFundsProgressBaseProps> = ({
  status,
  blockHash,
  blockNumber,
  href,
  onClose,
}) => {
  const { title, subtitle, animStatus, extra } = useStatusDetails(status)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <div className="text-body mt-32 text-lg font-bold">{title}</div>
      <div className="text-body-secondary mt-12 text-base font-light">{subtitle}</div>
      <div className="flex grow flex-col justify-center">
        <ProcessAnimation status={animStatus} className="h-[14.5rem]" />
      </div>
      <div className="text-body-secondary h-[10rem] px-10 text-center">
        {blockNumber ? (
          <>
            Included in{" "}
            {href ? (
              <a target="_blank" className="text-body" href={href}>
                block #{blockNumber}
              </a>
            ) : (
              <span className="text-body">block #{blockNumber}</span>
            )}
          </>
        ) : href ? (
          <>
            View transaction on{" "}
            <a target="_blank" className="text-body" href={href}>
              block explorer
            </a>
          </>
        ) : (
          extra
        )}
      </div>
      <Button fullWidth onClick={onClose}>
        Close
      </Button>
    </div>
  )
}

type SendFundsProgressSubstrateProps = {
  substrateTxId: string
  onClose?: () => void
  className?: string
}

const SendFundsProgressSubstrate: FC<SendFundsProgressSubstrateProps> = (props) => {
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
    <SendFundsProgressBase
      {...props}
      status={status}
      blockHash={blockHash}
      blockNumber={blockNumber}
      href={href}
    />
  )
}

type SendFundsProgressEvmProps = {
  evmNetworkId: EvmNetworkId
  evmTxHash: string
  onClose?: () => void
  className?: string
}

const SendFundsProgressProgressEvm: FC<SendFundsProgressEvmProps> = (props) => {
  const { blockHash, blockNumber, status, href } = useEvmTransactionWatch(
    props.evmNetworkId,
    props.evmTxHash
  )

  return (
    <SendFundsProgressBase
      {...props}
      status={status}
      blockHash={blockHash}
      blockNumber={blockNumber}
      href={href}
    />
  )
}

type SendFundsProgressProps = {
  substrateTxId?: string
  evmNetworkId?: EvmNetworkId
  evmTxHash?: string
  onClose?: () => void
  className?: string
}

export const SendFundsProgress: FC<SendFundsProgressProps> = ({
  substrateTxId,
  evmNetworkId,
  evmTxHash,
  onClose,
  className,
}) => {
  if (substrateTxId)
    return (
      <SendFundsProgressSubstrate
        substrateTxId={substrateTxId}
        onClose={onClose}
        className={className}
      />
    )

  if (evmNetworkId && evmTxHash)
    return (
      <SendFundsProgressProgressEvm
        evmNetworkId={evmNetworkId}
        evmTxHash={evmTxHash}
        onClose={onClose}
        className={className}
      />
    )

  return null
}
