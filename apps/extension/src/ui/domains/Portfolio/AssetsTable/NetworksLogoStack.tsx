import { WithTooltip } from "@talisman/components/Tooltip"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useMemo } from "react"

import { PortfolioNetwork, usePortfolioNetworks } from "./usePortfolioNetworks"

export const NetworksLogoStackItem = ({ network }: { network?: PortfolioNetwork }) => {
  const tooltip = useMemo(
    () => `${network?.label} (${network?.type})`,
    [network?.label, network?.type]
  )

  if (!network) return null

  return (
    <div className="ml-[-0.25rem] inline-block h-[1em] w-[1em] overflow-hidden">
      <WithTooltip tooltip={tooltip}>
        <ChainLogo key={network.id} id={network.id} />
      </WithTooltip>
    </div>
  )
}

const MoreNetworksTooltip = ({ networks }: { networks: PortfolioNetwork[] }) => {
  return (
    <div className="flex flex-col gap-1 text-left">
      {networks.map(({ label, type }, i) => (
        <div key={i}>
          {label} ({type})
        </div>
      ))}
    </div>
  )
}

export const NetworksLogoStackMore = ({ networks }: { networks: PortfolioNetwork[] }) => {
  if (!networks.length) return null

  return (
    <div className="ml-[-0.25rem] inline-block h-[1em] w-[1em] overflow-hidden">
      <WithTooltip tooltip={<MoreNetworksTooltip networks={networks} />}>
        <div className="bg-body-secondary column relative flex h-[1em] w-[1em] flex-col justify-center overflow-hidden rounded-full text-center text-black">
          <div className="text-[0.5em] font-bold leading-[1em]">+{networks.length}</div>
        </div>
      </WithTooltip>
    </div>
  )
}

type Props = { networkIds?: (ChainId | EvmNetworkId)[]; className?: string; max?: number }

export const NetworksLogoStack = ({ networkIds, className, max = 4 }: Props) => {
  const { networks } = usePortfolioNetworks(networkIds)

  const { visibleNetworks, moreNetworks } = useMemo(() => {
    return {
      visibleNetworks: networks?.slice(0, max) ?? [],
      moreNetworks: networks?.slice(max) ?? [],
    }
  }, [networks, max])

  return (
    <div className={classNames("h-[1em] pl-[0.25rem]", className)}>
      {visibleNetworks.map((network, idx) => (
        <NetworksLogoStackItem key={`${network}-${idx}`} network={network} />
      ))}
      <NetworksLogoStackMore networks={moreNetworks} />
    </div>
  )
}
