import { EvmNetwork } from "@extension/core"
import { activeEvmNetworksStore, isEvmNetworkActive } from "@extension/core"
import { isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useActiveEvmNetworksState } from "@ui/hooks/useActiveEvmNetworksState"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import sortBy from "lodash/sortBy"
import { ChangeEventHandler, useCallback, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { ListButton, Toggle } from "talisman-ui"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"

export const EvmNetworksList = ({ search }: { search?: string }) => {
  const { t } = useTranslation("admin")

  const [includeTestnets] = useSetting("useTestnets")
  const { evmNetworks } = useEvmNetworks({
    activeOnly: false,
    includeTestnets,
  })

  const networksActiveState = useActiveEvmNetworksState()

  const [filteredEvmNetworks, exactMatches] = useMemo(() => {
    const lowerSearch = search?.toLowerCase() ?? ""

    const filter = (network: EvmNetwork) => {
      if (!lowerSearch)
        return (
          network.isDefault ||
          networksActiveState[network.id] !== undefined ||
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
  }, [evmNetworks, networksActiveState, search])

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

  const handleNetworkActiveChanged = useCallback(
    (network: EvmNetwork) => (enable: boolean) => {
      activeEvmNetworksStore.setActive(network.id, enable)
    },
    []
  )

  const enableAll = useCallback(
    (enable = false) =>
      () => {
        activeEvmNetworksStore.set(
          Object.fromEntries(filteredEvmNetworks.map((n) => [n.id, enable]))
        )
      },
    [filteredEvmNetworks]
  )

  if (!sortedNetworks) return null

  return (
    <div className="flex flex-col gap-4">
      <div
        className={classNames(
          "flex w-full items-center justify-end gap-4",
          !filteredEvmNetworks.length && "invisible"
        )}
      >
        <button
          type="button"
          onClick={enableAll(true)}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Activate all")}
        </button>
        <div className="bg-body-disabled h-6 w-0.5"></div>
        <button
          type="button"
          onClick={enableAll(false)}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Deactivate all")}
        </button>
      </div>
      {sortedNetworks.map((network) => (
        <EvmNetworksListItem
          key={network.id}
          network={network}
          isActive={isEvmNetworkActive(network, networksActiveState)}
          onEnableChanged={handleNetworkActiveChanged(network)}
        />
      ))}
    </div>
  )
}

const EvmNetworksListItem = ({
  network,
  isActive: isActive,
  onEnableChanged,
}: {
  network: EvmNetwork
  isActive: boolean
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
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      onEnableChanged(e.target.checked)
    },
    [onEnableChanged]
  )

  const rowContent = intersection?.isIntersecting ? (
    <>
      <ListButton key={network.id} role="button" onClick={handleNetworkClick}>
        <ChainLogo className="rounded-full text-xl" id={network.id} />
        <div className="text-body truncate">{network.name}</div>
        {network.isTestnet && <TestnetPill />}
        {isCustomEvmNetwork(network) && <CustomPill />}
        <div className="min-w-[5rem] shrink-0 grow"></div>
        <ChevronRightIcon className="shrink-0 text-lg transition-none" />
      </ListButton>
      <Toggle
        className="absolute right-20 top-4 p-4"
        checked={isActive}
        onChange={handleEnableChanged}
      />
    </>
  ) : null

  return (
    <div ref={refContainer} className="relative h-28">
      {rowContent}
    </div>
  )
}
