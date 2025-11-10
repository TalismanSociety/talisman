import { NetworkId } from "@talismn/chaindata-provider"
import { classNames, isTruthy } from "@talismn/util"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { type PortfolioNetwork } from "@ui/domains/Portfolio/AssetsTable/usePortfolioNetworks"
import { useNetworksMapById } from "@ui/state"
import { useNetworkDisplayNamesMapById } from "@ui/state/networks"

type Props = { ids?: NetworkId[]; className?: string; max?: number }

const prioNetworks = [
  "1", // ethereum mainnet
  "8453", // base
  "42161", // arbitrum
  "146", // sonic
  "moonbeam",
  "mythos",
  "137", // polygon
  "169", // manta pacific

  "polkadot",
  "bittensor",
  "hydradx",
  "bifrost-polkadot",
  "astar",
  "avail",
  "vara",
  "kusama",
]

export const AllNetworksLogoStack = ({ className, ids, max = 4 }: Props) => {
  const allNetworksMap = useNetworksMapById()
  const networkNamesById = useNetworkDisplayNamesMapById()
  const networks = useMemo(
    () =>
      ids
        ?.map((id) => {
          const network = allNetworksMap[id]
          if (!network || network.isTestnet || !networkNamesById[id]) return null
          return { id, name: networkNamesById[id], logo: network?.logo }
        })
        .filter(isTruthy) ?? [],
    [allNetworksMap, ids, networkNamesById],
  )
  const sorted = useMemo(
    () =>
      networks?.sort((a, b) => {
        const aIsPrio = prioNetworks.includes(a.id)
        const bIsPrio = prioNetworks.includes(b.id)
        if (aIsPrio && !bIsPrio) return -1
        if (bIsPrio && !aIsPrio) return 1
        if (aIsPrio && bIsPrio) return prioNetworks.indexOf(a.id) - prioNetworks.indexOf(b.id)

        return a.name?.localeCompare(b.name) ?? 0
      }),
    [networks],
  )

  const { visibleNetworks, moreNetworks } = useMemo(
    () => ({
      visibleNetworks: sorted?.slice(0, max) ?? [],
      moreNetworks: sorted?.slice(max) ?? [],
    }),
    [sorted, max],
  )

  return (
    <div className={classNames("h-[1em] shrink-0 pl-[0.25rem]", className)}>
      {visibleNetworks.map((network, idx) => (
        <AllNetworksLogoStackItem key={`${network}-${idx}`} network={network} />
      ))}
      <AllNetworksLogoStackMore networks={moreNetworks} />
    </div>
  )
}

function AllNetworksLogoStackItem({ network }: { network?: PortfolioNetwork }) {
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

function AllNetworksLogoStackMore({ networks }: { networks: PortfolioNetwork[] }) {
  if (!networks.length) return null

  return (
    <div className="ml-[-0.25rem] inline-block h-[1em] w-auto overflow-hidden">
      <div className="text-body-secondary bg-grey-750 relative flex h-[1em] w-auto flex-col justify-center rounded-full px-2 text-center">
        <div className="text-[0.5em] font-bold leading-[1em]">{networks.length}+</div>
      </div>
    </div>
  )
}
