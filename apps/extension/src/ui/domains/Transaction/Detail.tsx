import { TransactionStatus } from "@core/domains/transactions/types"
import Button from "@talisman/components/Button"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import Link from "@ui/domains/Transaction/Link"
import Status from "@ui/domains/Transaction/Status"
import useChain from "@ui/hooks/useChain"
import { useEvmTransactionWatch } from "@ui/hooks/useEvmTransactionWatch"
import useTransactionById from "@ui/hooks/useTransactionById"
import { useMemo } from "react"
import styled from "styled-components"

type DetailsDisplayProps = {
  className?: string
  blockHash?: string
  blockNumber?: string
  status: TransactionStatus
  message?: string
  handleClose?: () => void
  href?: string
}

const UnstyledDetailDisplay = ({
  status,
  message,
  blockHash,
  blockNumber,
  href,
  handleClose,
  className,
}: DetailsDisplayProps) => (
  <section className={className}>
    <article>
      <Status status={status} message={message} />
    </article>
    <footer>
      {blockHash ? (
        <Link
          prefix="Included in block"
          blockHash={blockHash}
          blockNumber={blockNumber}
          href={href}
        />
      ) : (
        <span className="wait">"Awaiting confirmation..."</span>
      )}
      <Button onClick={handleClose}>Close</Button>
    </footer>
  </section>
)

const DetailDisplay = styled(UnstyledDetailDisplay)`
  display: flex;
  flex-direction: column;
  height: 100%;

  article {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin: 0 0 4vw 0;
  }

  footer {
    .transaction-link {
      font-size: var(--font-size-small);
      color: var(--color-background-muted-2x);
      margin-bottom: 1em;
      display: block;
      text-align: center;
      line-height: 1em;
    }

    .wait {
      //just a placeholder to prevent flickering
      visibility: hidden;
    }

    .button {
      display: block;
      width: 100%;
    }
  }
`

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
  evmNetworkId: EvmNetworkId
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

type DetailProps = {
  substrateTxId?: string
  evmNetworkId?: EvmNetworkId
  evmTxHash?: string
  handleClose?: () => void
  className?: string
}

const Detail = ({
  substrateTxId,
  evmNetworkId,
  evmTxHash,
  handleClose,
  className,
}: DetailProps) => {
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

export default Detail
