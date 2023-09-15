import { ChevronDownIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCurrentSite } from "@ui/apps/popup/context/CurrentSiteContext"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { EvmNetworkSelectDrawer } from "./EvmNetworkSelectDrawer"
import { NetworkLogo } from "./NetworkLogo"

export const EvmNetworkSelectPill = () => {
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id]
  )
  const network = useEvmNetwork(site?.ethChainId?.toString())

  const { isOpen, open, close } = useOpenClose()

  if (!site?.ethChainId) return null

  return (
    <>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-body-secondary bg-grey-850 hover:bg-grey-800 hover:text-grey-300 border-grey-800 flex h-[3.6rem] shrink-0 items-center gap-3 rounded-3xl border pl-2 pr-3 text-sm"
            onClick={open}
          >
            <NetworkLogo
              className={classNames("text-[2.8rem]", network ? "opacity-100" : "opacity-0")} // flickering hack
              ethChainId={network?.id}
            />
            <ChevronDownIcon className="shrink-0 text-base" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{network?.name}</TooltipContent>
      </Tooltip>
      <EvmNetworkSelectDrawer isOpen={isOpen} onClose={close} />
    </>
  )
}
