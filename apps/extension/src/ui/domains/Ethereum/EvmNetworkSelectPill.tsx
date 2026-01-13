import type { EthNetworkId } from "@talismn/chaindata-provider"
import { ChevronDownIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useAuthorisedSites, useNetworkById } from "@ui/state"
import { Suspense, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { NetworkLogo } from "../Networks/NetworkLogo"
import { EvmNetworkSelectDrawer } from "./EvmNetworkSelectDrawer"

const EvmNetworkName = ({ evmNetworkId }: { evmNetworkId: EthNetworkId }) => {
  const network = useNetworkById(evmNetworkId, "ethereum")

  if (!network) return null

  return <>{network?.name}</>
}

export const EvmNetworkSelectPill = () => {
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id]
  )

  const { isOpen, open, close } = useOpenClose()

  const evmNetworkId = site?.ethChainId?.toString()

  if (!evmNetworkId) return null

  return (
    <>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-[3.6rem] w-[6.2rem] shrink-0 items-center gap-3 rounded-3xl border border-grey-800 bg-grey-850 pr-3 pl-2 text-body-secondary text-sm hover:bg-grey-800 hover:text-grey-300"
            onClick={open}
          >
            <Suspense>
              <NetworkLogo
                className={classNames("text-[2.8rem] transition-opacity")} // flickering hack
                networkId={evmNetworkId}
              />
              <ChevronDownIcon className="shrink-0 text-base" />
            </Suspense>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <Suspense fallback={null}>
            <EvmNetworkName evmNetworkId={evmNetworkId} />
          </Suspense>
        </TooltipContent>
      </Tooltip>
      <EvmNetworkSelectDrawer isOpen={isOpen} onClose={close} />
    </>
  )
}
