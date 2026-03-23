import type { NetworkId } from "@talismn/chaindata-provider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WithTooltip } from "@ui/components/WithTooltip"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { cn } from "@ui/util/cn"
import { useMemo } from "react"

import { type PortfolioNetwork, usePortfolioNetworks } from "./usePortfolioNetworks"

const PortfolioNetworksLogoStackItem = ({ network }: { network?: PortfolioNetwork }) => {
  if (!network) return null

  return (
    <div className="ml-[-0.1563rem] inline-block h-[1em] w-[1em] overflow-hidden">
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
        // biome-ignore lint/suspicious/noArrayIndexKey: legacy
        <div key={i}>{name}</div>
      ))}
    </div>
  )
}

const PortfolioNetworksLogoStackMore = ({ networks }: { networks: PortfolioNetwork[] }) => {
  if (!networks.length) return null

  return (
    <div className="ml-[-0.1563rem] inline-block h-[1em] w-[1em] overflow-hidden">
      <WithTooltip tooltip={<MoreNetworksTooltip networks={networks} />}>
        <div className="column relative flex h-[1em] w-[1em] flex-col justify-center overflow-hidden rounded-full bg-body-secondary text-center text-black">
          <div className="font-bold text-[0.5em] leading-[1em]">+{networks.length}</div>
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
    <div className={cn("h-[1em] pl-[0.1563rem]", className)}>
      {visibleNetworks.map((network, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: legacy
        <PortfolioNetworksLogoStackItem key={`${network}-${idx}`} network={network} />
      ))}
      <PortfolioNetworksLogoStackMore networks={moreNetworks} />
    </div>
  )
}
