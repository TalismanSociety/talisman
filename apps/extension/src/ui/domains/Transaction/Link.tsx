import truncateString from "@talisman/util/truncateString"
import useChain from "@ui/hooks/useChain"
import useTransactionById from "@ui/hooks/useTransactionById"
import { useMemo } from "react"
import styled from "styled-components"

interface IProps {
  id: string
  prefix?: string
  className?: string
}

const TransactionLink = ({ id, prefix, className }: IProps) => {
  const { chainId, blockHash, blockNumber, extrinsicIndex } = useTransactionById(id)
  const { subscanUrl } = useChain(chainId) || {}

  const hashClassName = useMemo(() => `hash ${blockHash}`, [blockHash])
  const href = useMemo(() => {
    if (!subscanUrl) return null
    if (!blockNumber || typeof extrinsicIndex !== "number") return `${subscanUrl}block/${blockHash}`
    return `${subscanUrl}extrinsic/${blockNumber}-${extrinsicIndex}`
  }, [blockHash, blockNumber, extrinsicIndex, subscanUrl])

  return (
    <span className={`transaction-link ${className}`}>
      {!!blockHash && (
        <>
          {!!prefix && <span className="prefix">{prefix} </span>}
          {href ? (
            <a className={hashClassName} href={href} target="_blank" rel="noopener noreferrer">
              {blockNumber ? blockNumber : truncateString(blockHash, 4, 4)}
            </a>
          ) : (
            <span className={hashClassName}>
              {blockNumber ? blockNumber : truncateString(blockHash, 4, 4)}
            </span>
          )}
        </>
      )}
    </span>
  )
}

const StyledTransactionLink = styled(TransactionLink)`
  display: inline-block;
  font-size: var(--font-size-small);

  .prefix {
    color: var(--color-background-muted-2x);
  }

  .hash {
    color: var(--color-mid);
  }
  a.hash {
    text-decoration: underline;
  }
`

export default StyledTransactionLink
