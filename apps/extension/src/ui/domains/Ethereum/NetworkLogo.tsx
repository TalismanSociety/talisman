import globeIcon from "@talisman/theme/icons/globe.white.svg"
import { classNames } from "@talisman/util/classNames"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import styled from "styled-components"

const NetworkLogoContainer = styled.picture`
  & {
    width: 1em;
    height: 1em;
    position: relative;
  }
  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
`

type NetworkLogoProps = {
  ethChainId?: EvmNetworkId
  className?: string
}

export const NetworkLogo = ({ ethChainId, className }: NetworkLogoProps) => {
  const network = useEvmNetwork(ethChainId)

  if (!network) return null

  return (
    <NetworkLogoContainer className={classNames("network-logo", className)}>
      {"iconUrls" in network && network.iconUrls?.map((url, i) => <source key={i} srcSet={url} />)}
      {(!("isCustom" in network) || !network.isCustom) && (
        <source
          srcSet={`https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/split-entities/assets/${
            network.substrateChain?.id ?? network.id
          }/logo.svg`}
        />
      )}
      <img src={globeIcon} alt="" />
    </NetworkLogoContainer>
  )
}
