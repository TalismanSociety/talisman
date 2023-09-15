import { Chain } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import useChains from "@ui/hooks/useChains"
import { useSetting } from "@ui/hooks/useSettings"
import { isCustomChain } from "@ui/util/isCustomChain"
import sortBy from "lodash/sortBy"
import { useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { ListButton } from "talisman-ui"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"

export const ChainsList = ({ search }: { search?: string }) => {
  const [useTestnets] = useSetting("useTestnets")
  const { chains } = useChains(useTestnets)

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
  if (!sortedChains) return null

  return (
    <div className="flex flex-col gap-4">
      {sortedChains.map((chain) => (
        <ChainsListItem key={chain.id} chain={chain} />
      ))}
    </div>
  )
}

const ChainsListItem = ({ chain }: { chain: Chain }) => {
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
  const refButton = useRef<HTMLButtonElement>(null)
  const intersection = useIntersection(refButton, {
    root: null,
    rootMargin: "1000px",
  })

  const buttonContent = intersection?.isIntersecting ? (
    <>
      <ChainLogo className="rounded-full text-xl" id={chain.id} />
      <div className="text-body grow">{chain.name}</div>
      {chain.isTestnet && <TestnetPill />}
      {isCustomChain(chain) && <CustomPill />}
      <ChevronRightIcon className="text-lg transition-none" />
    </>
  ) : null

  return (
    <ListButton ref={refButton} key={chain.id} role="button" onClick={handleChainClick}>
      {buttonContent}
    </ListButton>
  )
}
