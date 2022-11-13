import { EvmNetworkId } from "@talismn/chaindata-provider"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"

type NetworkLogoProps = {
  ethChainId?: EvmNetworkId
  className?: string
}
export const NetworkLogo = ({ className, ethChainId }: NetworkLogoProps) => (
  <ChainLogo className={className} id={ethChainId} />
)
