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
import { CustomPill, TestnetPill } from "./Pill"

export const ChainsList = () => {
  const [useTestnets] = useSetting("useTestnets")
  const { chains } = useChains(useTestnets)

  const sortedChains = useMemo(() => sortBy(chains, "name"), [chains])
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
    navigate(`./${chain.id}?type=polkadot`)
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
