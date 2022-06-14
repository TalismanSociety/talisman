import { ReactNode, useMemo } from "react"
import { CustomErc20Token, CustomEvmNetwork, EvmNetwork } from "@core/types"
import { Drawer } from "@talisman/components/Drawer"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import styled from "styled-components"

const ViewDetailsContainer = styled.div`
  background: var(--color-background-muted);
  padding: 2.4rem;
  border-radius: 2.4rem 2.4rem 0px 0px;
  font-size: var(--font-size-small);
  line-height: 2rem;
  display: flex;
  flex-direction: column;
  max-height: 48rem;
  color: var(--color-mid);

  .grow {
    flex-grow: 1;
    overflow-y: auto;
  }

  button {
    margin-top: 2.4rem;
    width: 100%;
  }

  h3 {
    font-size: 1.4rem;
    line-height: 2rem;
    margin: 1.6remrem 0;
  }

  .vd-entry {
    h4 {
      padding: 0;
      font-size: 1.2rem;
      line-height: 1.6rem;
      margin: 1.2rem 0 0.4rem 0;
    }
    p {
      color: var(--color-foreground);
      word-break: break-all;
      margin: 0;
      padding: 0;
      font-size: 1.2rem;
      line-height: 1.6rem;
      white-space: pre-wrap;
    }
    a {
      color: var(--color-foreground);
      opacity: 1;
    }
  }
`

const Button = styled.button`
  background: var(--color-background-muted-3x);
  padding: 0.4rem 0.6rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
  outline: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-speed-fast) ease-in;
  margin-bottom: 0.4rem;

  font-size: var(--font-size-tiny);
  line-height: var(--font-size-xsmall);

  :hover {
    background: var(--color-background-muted-3x);
    color: var(--color-foreground-muted-2x);
  }
`

type ViewDetailsEntryProps = {
  title: string
  value?: ReactNode
  href?: string
}

const ViewDetailsEntry = ({ title, value, href }: ViewDetailsEntryProps) => (
  <div className="vd-entry">
    <h4>{title}</h4>
    <p>
      {href ? (
        <a target="_blank" href={href}>
          {value}
        </a>
      ) : (
        value
      )}
    </p>
  </div>
)

type CustomErc20TokenViewDetailsProps = {
  token: CustomErc20Token
  network: EvmNetwork | CustomEvmNetwork
}

export const CustomErc20TokenViewDetails = ({
  token,
  network,
}: CustomErc20TokenViewDetailsProps) => {
  const { isOpen, open, close } = useOpenClose()

  const contractUrl = useMemo(() => {
    if (!network.explorerUrl) return ""
    return `${network.explorerUrl}/address/${token.contractAddress}`
  }, [network.explorerUrl, token.contractAddress])

  return (
    <>
      <Button onClick={open}>View Details</Button>
      <Drawer open={isOpen} onClose={close} anchor="bottom">
        <ViewDetailsContainer>
          <h3>Token Details</h3>
          <div className="grow">
            <ViewDetailsEntry title="Network" value={network.name} />
            <ViewDetailsEntry title="Symbol" value={token.symbol} />
            <ViewDetailsEntry title="Decimals" value={token.decimals} />
            <ViewDetailsEntry title="Contract" value={token.contractAddress} href={contractUrl} />
          </div>
          <div>
            <SimpleButton onClick={close}>Close</SimpleButton>
          </div>
        </ViewDetailsContainer>
      </Drawer>
    </>
  )
}
