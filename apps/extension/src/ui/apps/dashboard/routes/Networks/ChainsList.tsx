import { activeChainsStore, isChainActive } from "@extension/core"
import { Chain, isCustomChain } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useActiveChainsState } from "@ui/hooks/useActiveChainsState"
import useChains from "@ui/hooks/useChains"
import { useSetting } from "@ui/hooks/useSettings"
import sortBy from "lodash/sortBy"
import { ChangeEventHandler, useCallback, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { ListButton, Toggle } from "talisman-ui"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"

export const ChainsList = ({ search }: { search?: string }) => {
  const { t } = useTranslation("admin")
  const [useTestnets] = useSetting("useTestnets")
  const { chains: allChains } = useChains({ activeOnly: false, includeTestnets: true })
  const networksActiveState = useActiveChainsState()
  const chains = useMemo(
    () => (useTestnets ? allChains : allChains.filter((n) => !n.isTestnet)),
    [allChains, useTestnets]
  )

  const [filteredChains, exactMatches] = useMemo(() => {
    if (search === undefined || search.length < 1) return [chains, [] as string[]] as const
    const lowerSearch = search.toLowerCase()

    const filter = (chain: Chain) =>
      chain.name?.toLowerCase().includes(lowerSearch) ||
      chain.nativeToken?.id.toLowerCase().includes(lowerSearch)

    const filtered = chains.filter(filter)
    const exactMatches = filtered.flatMap((chain) =>
      lowerSearch.trim() === chain.name?.toLowerCase().trim() ||
      lowerSearch.trim() === chain.nativeToken?.id.toLowerCase().trim()
        ? [chain.id]
        : []
    )

    return [filtered, exactMatches] as const
  }, [chains, search])

  const sortedChains = useMemo(() => {
    const byName = sortBy(filteredChains, "name")
    if (exactMatches.length < 1) return byName

    // put exact matches at the top of the list
    return byName.sort((a, b) => {
      const aExactMatch = exactMatches.includes(a.id)
      const bExactMatch = exactMatches.includes(b.id)
      if (aExactMatch && !bExactMatch) return -1
      if (bExactMatch && !aExactMatch) return 1
      return 0
    })
  }, [exactMatches, filteredChains])

  const handleNetworkActiveChanged = useCallback(
    (network: Chain) => (enable: boolean) => {
      activeChainsStore.setActive(network.id, enable)
    },
    []
  )

  const activateAll = useCallback(
    (activate = false) =>
      () => {
        activeChainsStore.set(Object.fromEntries(filteredChains.map((n) => [n.id, activate])))
      },
    [filteredChains]
  )

  if (!sortedChains) return null

  return (
    <div className="flex flex-col gap-4">
      <div
        className={classNames(
          "flex w-full items-center justify-end gap-4",
          !filteredChains.length && "invisible"
        )}
      >
        <button
          type="button"
          onClick={activateAll(true)}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Activate all")}
        </button>
        <div className="bg-body-disabled h-6 w-0.5"></div>
        <button
          type="button"
          onClick={activateAll(false)}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Deactivate all")}
        </button>
      </div>
      {sortedChains.map((chain) => (
        <ChainsListItem
          key={chain.id}
          chain={chain}
          isActive={isChainActive(chain, networksActiveState)}
          onEnableChanged={handleNetworkActiveChanged(chain)}
        />
      ))}
    </div>
  )
}

const ChainsListItem = ({
  chain,
  isActive,
  onEnableChanged,
}: {
  chain: Chain
  isActive: boolean
  onEnableChanged: (enable: boolean) => void
}) => {
  const navigate = useNavigate()
  const handleChainClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "chain settings button",
      properties: {
        chainId: chain.id,
      },
    })
    navigate(`./${chain.id}`)
  }, [navigate, chain.id])

  // there are lots of chains so we should only render visible rows to prevent performance issues
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
      <ListButton key={chain.id} role="button" onClick={handleChainClick}>
        <ChainLogo className="rounded-full text-xl" id={chain.id} />
        <div className="text-body truncate">{chain.name}</div>
        {chain.isTestnet && <TestnetPill />}
        {isCustomChain(chain) && <CustomPill />}
        <div className="min-w-[4.4rem] shrink-0 grow"></div>
        <ChevronRightIcon className="transition-noneshrink-0 text-lg" />
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
