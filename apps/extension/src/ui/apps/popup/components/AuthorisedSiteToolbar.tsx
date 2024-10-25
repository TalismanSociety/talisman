import { useMemo } from "react"

import { EvmNetworkSelectPill } from "@ui/domains/Ethereum/EvmNetworkSelectPill"
import { ConnectedAccountsPill } from "@ui/domains/Site/ConnectedAccountsPill"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useAuthorisedSites } from "@ui/state"

export const AuthorisedSiteToolbar = () => {
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const isAuthorised = useMemo(
    () => Boolean(currentSite?.id && authorisedSites[currentSite?.id]),
    [authorisedSites, currentSite?.id],
  )

  if (!isAuthorised) return null

  return (
    <>
      <div className="absolute left-0 top-0 z-20 flex w-full shrink-0 items-center justify-between gap-4 px-8 pt-8">
        <ConnectedAccountsPill />
        <EvmNetworkSelectPill />
      </div>
      {/* Placeholder to reserve scrolling space */}
      <div className="h-[3.6rem] w-full shrink-0"></div>
    </>
  )
}
