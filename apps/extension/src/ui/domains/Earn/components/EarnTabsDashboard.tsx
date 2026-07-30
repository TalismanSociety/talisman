import { useDefaultTaoDashboardNetworkId } from "@ui/domains/TaoDashboard/hooks/useIsBittensorEnabled"
import { getTaoDashboardUrl } from "@ui/domains/TaoDashboard/shared/util"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { BITTENSOR_NETWORK_ID, BITTENSOR_NETWORK_IDS } from "@ui/state/bittensor"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { EarnTabs, type EarnTabsKey } from "./EarnTabs"

const TAB_TO_PATH: Record<Exclude<EarnTabsKey, "bittensor">, string> = {
  assets: "/earn/positions",
  discover: "/earn/discover",
}

const getTabFromPath = (pathname: string): EarnTabsKey => {
  if (BITTENSOR_NETWORK_IDS.some((networkId) => pathname.startsWith(`/${networkId}/`)))
    return "bittensor"
  return (
    (Object.entries(TAB_TO_PATH).find(([, path]) =>
      pathname.startsWith(path)
    )?.[0] as EarnTabsKey) || "assets"
  )
}

export const EarnTabsDashboard: FC<{ className?: string }> = ({ className }) => {
  const location = useLocation()
  const navigate = useNavigateWithQuery()
  const taoDashboardNetworkId = useDefaultTaoDashboardNetworkId()

  const selectedTab = useMemo<EarnTabsKey>(
    () => getTabFromPath(location.pathname),
    [location.pathname]
  )

  const handleTabChange = useCallback(
    (tab: EarnTabsKey) => {
      if (tab === selectedTab) return
      navigate(
        tab === "bittensor"
          ? getTaoDashboardUrl(taoDashboardNetworkId ?? BITTENSOR_NETWORK_ID)
          : TAB_TO_PATH[tab]
      )
    },
    [navigate, selectedTab, taoDashboardNetworkId]
  )

  return (
    <EarnTabs
      onTabChange={handleTabChange}
      value={selectedTab}
      className={cn("my-0 h-14 w-auto font-bold text-md", className)}
    />
  )
}
