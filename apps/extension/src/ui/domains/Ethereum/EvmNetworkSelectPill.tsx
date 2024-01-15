import { EvmNetworkId } from "@talismn/chaindata-provider"
import { ChevronDownIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { Suspense, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { EvmNetworkSelectDrawer } from "./EvmNetworkSelectDrawer"
import { NetworkLogo } from "./NetworkLogo"

const EvmNetworkName = ({ evmNetworkId }: { evmNetworkId: EvmNetworkId }) => {
  const network = useEvmNetwork(evmNetworkId)

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
            className="text-body-secondary bg-grey-850 hover:bg-grey-800 hover:text-grey-300 border-grey-800 flex h-[3.6rem] w-[6.2rem] shrink-0 items-center gap-3 rounded-3xl border pl-2 pr-3 text-sm"
            onClick={open}
          >
            <Suspense>
              <NetworkLogo
                className={classNames("text-[2.8rem] transition-opacity")} // flickering hack
                ethChainId={evmNetworkId}
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
