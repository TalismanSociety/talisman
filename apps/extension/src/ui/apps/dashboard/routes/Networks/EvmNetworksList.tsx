import { EvmNetwork } from "@core/domains/ethereum/types"
import { ChevronRightIcon } from "@talismn/icons"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import sortBy from "lodash/sortBy"
import { useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { ListButton } from "talisman-ui"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pill"

export const EvmNetworksList = () => {
  const [useTestnets] = useSetting("useTestnets")
  const { evmNetworks } = useEvmNetworks(useTestnets)

  const sortedNetworks = useMemo(() => sortBy(evmNetworks, "name"), [evmNetworks])
  if (!sortedNetworks) return null

  return (
    <div className="flex flex-col gap-4">
      {sortedNetworks.map((network) => (
        <EvmNetworksListItem key={network.id} network={network} />
      ))}
    </div>
  )
}

const EvmNetworksListItem = ({ network }: { network: EvmNetwork }) => {
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
    navigate(`./${network.id}?type=ethereum`)
  }, [navigate, network.id])

  // there are lots of networks so we should only render visible rows to prevent performance issues
  const refButton = useRef<HTMLButtonElement>(null)
  const intersection = useIntersection(refButton, {
    root: null,
    rootMargin: "1000px",
  })

  const buttonContent = intersection?.isIntersecting ? (
    <>
      <ChainLogo className="rounded-full text-xl" id={network.id} />
      <div className="text-body grow">{network.name}</div>
      {network.isTestnet && <TestnetPill />}
      {isCustomEvmNetwork(network) && <CustomPill />}
      <ChevronRightIcon className="text-lg transition-none" />
    </>
  ) : null

  return (
    <ListButton ref={refButton} key={network.id} role="button" onClick={handleNetworkClick}>
      {buttonContent}
    </ListButton>
  )
}
