import { cn } from "@talismn/util"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { type FC, useCallback, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { EarnTabs, type EarnTabsKey } from "./EarnTabs"

const TAB_TO_PATH: Record<EarnTabsKey, string> = {
  assets: "/earn/positions",
  discover: "/earn/discover",
  bittensor: "/bittensor/subnets",
}

const getTabFromPath = (pathname: string): EarnTabsKey => {
  return (
    (Object.entries(TAB_TO_PATH).find(([, path]) =>
      pathname.startsWith(path)
    )?.[0] as EarnTabsKey) || "assets"
  )
}

export const EarnTabsDashboard: FC<{ className?: string }> = ({ className }) => {
  const location = useLocation()
  const navigate = useNavigateWithQuery()

  const selectedTab = useMemo<EarnTabsKey>(
    () => getTabFromPath(location.pathname),
    [location.pathname]
  )

  const handleTabChange = useCallback(
    (tab: EarnTabsKey) => {
      if (tab === selectedTab) return
      navigate(TAB_TO_PATH[tab])
    },
    [navigate, selectedTab]
  )

  return (
    <EarnTabs
      onTabChange={handleTabChange}
      value={selectedTab}
      className={cn("my-0 h-14 w-auto font-bold text-md", className)}
    />
  )
}
