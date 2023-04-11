import { HexString } from "@polkadot/util/types"
import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Pending Transfer Page",
}

export const SendFundsSubmitted = () => {
  const [searchParams] = useSearchParams()

  useAnalyticsPageView(ANALYTICS_PAGE)

  const { hash, networkIdOrHash } = useMemo(
    () => ({
      hash: (searchParams.get("hash") as HexString) ?? undefined,
      networkIdOrHash: (searchParams.get("networkIdOrHash") as string) ?? undefined,
    }),
    [searchParams]
  )

  const handleClose = useCallback(() => {
    window.close()
  }, [])

  return (
    <div id="main" className="relative h-full w-full px-12 py-8">
      <SendFundsProgress hash={hash} networkIdOrHash={networkIdOrHash} onClose={handleClose} />
    </div>
  )
}
