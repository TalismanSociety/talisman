import {
  EvmWalletTransaction,
  SubWalletTransaction,
  TransactionStatus,
} from "@core/domains/transactions"
import { HexString } from "@polkadot/util/types"
import { ExternalLinkIcon } from "@talisman/theme/icons"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import useChains from "@ui/hooks/useChains"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useTransactionByHash from "@ui/hooks/useTransactionByHash"
import { FC, useMemo } from "react"
import { Button, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"
import urlJoin from "url-join"

const useStatusDetails = (status: TransactionStatus) => {
  const { title, subtitle, extra, animStatus } = useMemo<{
    title: string
    subtitle: string
    animStatus: ProcessAnimationStatus
    extra?: string
  }>(() => {
    switch (status) {
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
          title: "Success",
          subtitle: "Your transfer was successful!",
          animStatus: "success",
        }
      case "pending":
        return {
          title: "Transfer in progress",
          subtitle: "This may take a few minutes.",
          extra: "You can now close this window. Your transfer will continue in the background.",
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
  blockNumber?: string
  status: TransactionStatus
  onClose?: () => void
  href?: string
}

const SendFundsProgressBase: FC<SendFundsProgressBaseProps> = ({
  status,
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
      className={className}
      onClose={onClose}
      status={tx.status}
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
      className={className}
      onClose={onClose}
      status={tx.status}
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
