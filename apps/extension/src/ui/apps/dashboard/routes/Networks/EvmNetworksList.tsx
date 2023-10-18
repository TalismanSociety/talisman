import {
  enabledEvmNetworksStore,
  isEvmNetworkEnabled,
} from "@core/domains/ethereum/store.enabledEvmNetworks"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useEvmNetworkEnabledState } from "@ui/hooks/useEvmNetworkEnabledState"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import sortBy from "lodash/sortBy"
import { ChangeEventHandler, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { ListButton, Toggle } from "talisman-ui"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"

export const EvmNetworksList = ({ search }: { search?: string }) => {
  const [useTestnets] = useSetting("useTestnets")
  const { evmNetworks: allEvmNetworks } = useEvmNetworks("all")
  const evmNetworks = useMemo(
    () => (useTestnets ? allEvmNetworks : allEvmNetworks.filter((n) => !n.isTestnet)),
    [allEvmNetworks, useTestnets]
  )
  const networksEnabledState = useEvmNetworkEnabledState()

  const [filteredEvmNetworks, exactMatches] = useMemo(() => {
    const lowerSearch = search?.toLowerCase() ?? ""

    const filter = (network: EvmNetwork) => {
      if (!lowerSearch)
        return (
          network.isDefault ||
          networksEnabledState[network.id] !== undefined ||
          isCustomEvmNetwork(network)
        )

      return (
        network.name?.toLowerCase().includes(lowerSearch) ||
        network.nativeToken?.id.toLowerCase().includes(lowerSearch)
      )
    }

    const filtered = evmNetworks.filter(filter)
    const exactMatches = filtered.flatMap((network) =>
      lowerSearch.trim() === network.name?.toLowerCase().trim() ||
      lowerSearch.trim() === network.nativeToken?.id.toLowerCase().trim()
        ? [network.id]
        : []
    )

    return [filtered, exactMatches] as const
  }, [evmNetworks, networksEnabledState, search])

  const sortedNetworks = useMemo(() => {
    const byName = sortBy(filteredEvmNetworks, "name")
    if (exactMatches.length < 1) return byName

    // put exact matches at the top of the list
    return byName.sort((a, b) => {
      const aExactMatch = exactMatches.includes(a.id)
      const bExactMatch = exactMatches.includes(b.id)
      if (aExactMatch && !bExactMatch) return -1
      if (bExactMatch && !aExactMatch) return 1
      return 0
    })
  }, [exactMatches, filteredEvmNetworks])

  const handleNetworkEnabledChanged = useCallback(
    (network: EvmNetwork) => (enable: boolean) => {
      enabledEvmNetworksStore.setEnabled(network.id, enable)
    },
    []
  )

  if (!sortedNetworks) return null

  return (
    <div className="flex flex-col gap-4">
      {sortedNetworks.map((network) => (
        <EvmNetworksListItem
          key={network.id}
          network={network}
          isEnabled={isEvmNetworkEnabled(network, networksEnabledState)}
          onEnableChanged={handleNetworkEnabledChanged(network)}
        />
      ))}
    </div>
  )
}

const EvmNetworksListItem = ({
  network,
  isEnabled,
  onEnableChanged,
}: {
  network: EvmNetwork
  isEnabled: boolean
  onEnableChanged: (enable: boolean) => void
}) => {
  const navigate = useNavigate()
  const handleNetworkClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "network settings button",
      properties: {
        networkId: network.id.toString(),
      },
    })
    navigate(`./${network.id}`)
  }, [navigate, network.id])

  // there are lots of networks so we should only render visible rows to prevent performance issues
  const refButton = useRef<HTMLButtonElement>(null)
  const intersection = useIntersection(refButton, {
    root: null,
    rootMargin: "1000px",
  })

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      onEnableChanged(e.target.checked)
    },
    [onEnableChanged]
  )

  const buttonContent = intersection?.isIntersecting ? (
    <>
      <ChainLogo className="rounded-full text-xl" id={network.id} />
      <div className="text-body truncate">{network.name}</div>
      {network.isTestnet && <TestnetPill />}
      {isCustomEvmNetwork(network) && <CustomPill />}
      <div className="min-w-[5rem] shrink-0 grow"></div>
      <ChevronRightIcon className="shrink-0 text-lg transition-none" />
    </>
  ) : null

  return (
    <div className="relative h-28">
      <ListButton ref={refButton} key={network.id} role="button" onClick={handleNetworkClick}>
        {buttonContent}
      </ListButton>
      <Toggle
        className="absolute right-20 top-4 p-4"
        checked={isEnabled}
        onChange={handleEnableChanged}
      />
    </div>
  )
}
