import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { WithTooltip } from "@talisman/components/Tooltip"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { type PortfolioNetwork } from "@ui/domains/Portfolio/AssetsTable/usePortfolioNetworks"
import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { useChainsMap, useEvmNetworksMap } from "@ui/state"

type Props = { ids?: (ChainId | EvmNetworkId)[]; className?: string; max?: number }

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
  "aleph-zero",
  "bifrost-polkadot",
  "astar",
  "avail",
  "vara",
  "kusama",
]

export const AllNetworksLogoStack = ({ className, ids, max = 4 }: Props) => {
  const { t } = useTranslation()

  const chainsMap = useChainsMap()
  const evmNetworksMap = useEvmNetworksMap()
  const networks = useMemo(
    () =>
      ids?.flatMap((id) => {
        const chain = chainsMap[id]
        const evmNetwork = evmNetworksMap[id]
        if (!chain && !evmNetwork) return []
        if (chain?.isTestnet || evmNetwork?.isTestnet) return []

        const relay = chain?.relay?.id ? chainsMap[chain.relay.id] : null
        const { label, type } = getNetworkInfo(t, { chain, evmNetwork, relay })

        return { id, label, type, logo: chain?.logo ?? evmNetwork?.logo }
      }),
    [chainsMap, evmNetworksMap, ids, t],
  )
  const sorted = useMemo(
    () =>
      networks?.sort((a, b) => {
        const aIsPrio = prioNetworks.includes(a.id)
        const bIsPrio = prioNetworks.includes(b.id)
        if (aIsPrio && !bIsPrio) return -1
        if (bIsPrio && !aIsPrio) return 1
        if (aIsPrio && bIsPrio) return prioNetworks.indexOf(a.id) - prioNetworks.indexOf(b.id)

        return a.label?.localeCompare(b.label ?? "") ?? 0
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
  const tooltip = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <ChainLogo id={network?.id} />
        <div>
          {network?.label} ({network?.type})
        </div>
      </div>
    ),
    [network],
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
