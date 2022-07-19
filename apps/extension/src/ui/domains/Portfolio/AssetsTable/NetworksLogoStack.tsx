import { Box } from "@talisman/components/Box"
import { WithTooltip } from "@talisman/components/Tooltip"
import { classNames } from "@talisman/util/classNames"
import { useMemo } from "react"
import styled from "styled-components"

import StyledAssetLogo from "../../Asset/Logo"
import { PortfolioNetwork, usePortfolioNetworks } from "./usePortfolioNetworks"

export const Container = styled.div`
  height: 1em;
  overflow: hidden;
  padding-left: 0.25em;
  .item {
    margin-left: -0.25rem;
  }
  .logo-circle {
    border: 1px solid white;
  }
`

export const NetworksLogoStackItem = ({ network }: { network?: PortfolioNetwork }) => {
  const tooltip = useMemo(
    () => `${network?.label} (${network?.type})`,
    [network?.label, network?.type]
  )

  if (!network) return null

  return (
    <Box inlineBlock w="1em" h="1em" className="item" overflow="hidden">
      <WithTooltip tooltip={tooltip}>
        <StyledAssetLogo key={network.id} id={network.logoId} className="logo-circle" />
      </WithTooltip>
    </Box>
  )
}

const MoreNetworksTooltip = ({ networks }: { networks: PortfolioNetwork[] }) => {
  return (
    <Box textalign="left">
      {networks.map(({ label, type }, i) => (
        <div key={i}>
          {label} ({type})
        </div>
      ))}
    </Box>
  )
}

export const NetworksLogoStackMore = ({ networks }: { networks: PortfolioNetwork[] }) => {
  if (!networks.length) return null

  return (
    <Box inlineBlock w="1em" h="1em" className="item" overflow="hidden">
      <WithTooltip tooltip={<MoreNetworksTooltip networks={networks} />}>
        <Box
          circle
          bg="mid"
          w="1em"
          h="1em"
          flex
          column
          align="center"
          justify="center"
          overflow="hidden"
          lineheightcustom="1em"
          fg="background"
          className="logo-circle"
        >
          <Box fontsizecustom="0.5em" h="1em" lineheightcustom="1em" textalign="center" bold>
            +{networks.length}
          </Box>
        </Box>
      </WithTooltip>
    </Box>
  )
}

type Props = { networkIds?: (string | number)[]; className?: string; max?: number }

export const NetworksLogoStack = ({ networkIds, className, max = 1 }: Props) => {
  const networks = usePortfolioNetworks(networkIds)

  const { visibleNetworks, moreNetworks } = useMemo(() => {
    return {
      visibleNetworks: networks?.slice(0, max) ?? [],
      moreNetworks: networks?.slice(max) ?? [],
    }
  }, [networks, max])

  return (
    <Container className={classNames("logo-stack", className)}>
      {visibleNetworks.map((network, idx) => (
        <NetworksLogoStackItem key={`${network}-${idx}`} network={network} />
      ))}
      <NetworksLogoStackMore networks={moreNetworks} />
    </Container>
  )
}
