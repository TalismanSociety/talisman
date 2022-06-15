import { useMemo } from "react"
import styled from "styled-components"
import StyledAssetLogo from "../Asset/Logo"

export const Container = styled.div`
  font-size: 1.8rem;
  height: 1em;
  padding-left: 0.6rem;
  .chain-logo {
    display: inline-block;
    margin-left: -0.6rem;
  }
`

type Props = { chainIds?: string[]; className?: string }

export const ChainLogoStack = ({ chainIds, className }: Props) => {
  // dedupe and remove undefined entries
  const safeChainIds = useMemo(() => {
    return [...new Set(chainIds?.filter(Boolean))]
  }, [chainIds])

  return (
    <Container className={className}>
      {safeChainIds?.map((chainId) => (
        <StyledAssetLogo key={chainId} id={chainId} />
      ))}
    </Container>
  )
}
