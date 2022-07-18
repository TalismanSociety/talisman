import { ChainId } from "@core/domains/chains/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { classNames } from "@talisman/util/classNames"
import styled from "styled-components"

import StyledAssetLogo from "../../Asset/Logo"
import { usePortfolioNetwork } from "./usePortfolioNetwork"

export const Container = styled.div`
  height: 1em;
  padding-left: 0.25em;
  .chain-logo {
    display: inline-block;
    margin-left: -0.25rem;
  }
`

export const NetworksLogoStackItem = ({ chainId }: { chainId: number | string }) => {
  const chain = usePortfolioNetwork(chainId)

  if (!chain) return null

  return (
    <WithTooltip tooltip={`${chain.label} (${chain.type})`}>
      <StyledAssetLogo key={`${chainId}`} id={chain.logoId} />
    </WithTooltip>
  )
}

type Props = { networkIds?: (string | number)[]; className?: string }

export const NetworksLogoStack = ({ networkIds: chainIds, className }: Props) => {
  return (
    <Container className={classNames("logo-stack", className)}>
      {chainIds?.filter(Boolean).map((chainId, idx) => (
        <NetworksLogoStackItem key={`${chainId}-${idx}`} chainId={chainId} />
      ))}
    </Container>
  )
}
