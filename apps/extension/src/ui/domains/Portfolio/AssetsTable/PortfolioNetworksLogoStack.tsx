import { NetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { WithTooltip } from "@talisman/components/Tooltip"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"

import { PortfolioNetwork, usePortfolioNetworks } from "./usePortfolioNetworks"

export const PortfolioNetworksLogoStackItem = ({ network }: { network?: PortfolioNetwork }) => {
  if (!network) return null

  return (
    <div className="ml-[-0.25rem] inline-block h-[1em] w-[1em] overflow-hidden">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="size-[1em] shrink-0">
            <NetworkLogo key={network.id} networkId={network.id} />
          </div>
        </TooltipTrigger>
        <TooltipContent>{network.name}</TooltipContent>
      </Tooltip>
    </div>
  )
}

const MoreNetworksTooltip = ({ networks }: { networks: PortfolioNetwork[] }) => {
  return (
    <div className="flex flex-col gap-1 text-left">
      {networks.map(({ name }, i) => (
        <div key={i}>{name}</div>
      ))}
    </div>
  )
}

export const PortfolioNetworksLogoStackMore = ({ networks }: { networks: PortfolioNetwork[] }) => {
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

type Props = { networkIds?: NetworkId[]; className?: string; max?: number }

export const PortfolioNetworksLogoStack = ({ networkIds, className, max = 4 }: Props) => {
  const networks = usePortfolioNetworks(networkIds)

  const { visibleNetworks, moreNetworks } = useMemo(() => {
    return {
      visibleNetworks: networks?.slice(0, max) ?? [],
      moreNetworks: networks?.slice(max) ?? [],
    }
  }, [networks, max])

  return (
    <div className={classNames("h-[1em] pl-[0.25rem]", className)}>
      {visibleNetworks.map((network, idx) => (
        <PortfolioNetworksLogoStackItem key={`${network}-${idx}`} network={network} />
      ))}
      <PortfolioNetworksLogoStackMore networks={moreNetworks} />
    </div>
  )
}
