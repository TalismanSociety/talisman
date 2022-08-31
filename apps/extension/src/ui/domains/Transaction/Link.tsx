import truncateString from "@talisman/util/truncateString"
import useChain from "@ui/hooks/useChain"
import useTransactionById from "@ui/hooks/useTransactionById"
import { useMemo } from "react"
import styled from "styled-components"

interface IProps {
  prefix?: string
  className?: string
  blockHash?: string
  blockNumber?: string
  href?: string
}

const TransactionLink = ({ blockHash, blockNumber, href, prefix, className }: IProps) => {
  const hashClassName = useMemo(() => `hash ${blockHash}`, [blockHash])
  const block = useMemo(
    () => (blockNumber ? blockNumber : truncateString(blockHash, 4, 4)),
    [blockHash, blockNumber]
  )

  return (
    <span className={`transaction-link ${className}`}>
      {!!blockHash && (
        <>
          {!!prefix && <span className="prefix">{prefix} </span>}
          {href ? (
            <a className={hashClassName} href={href} target="_blank" rel="noopener noreferrer">
              {block}
            </a>
          ) : (
            <span className={hashClassName}>{block}</span>
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
