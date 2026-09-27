import type { AnalyticsPage } from "@ui/api/analytics"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { useSendFundsWizard } from "./context"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Pending Transfer Page",
}

export const SendFundsSubmitted = () => {
  const [searchParams] = useSearchParams()
  const { gotoProgress } = useSendFundsWizard()

  useAnalyticsPageView(ANALYTICS_PAGE)

  const [txId, networkId] = useMemo(
    () => [
      (searchParams.get("txId") as string) ?? undefined,
      (searchParams.get("networkId") as string) ?? undefined,
    ],
    [searchParams]
  )

  const handleClose = useCallback(() => {
    window.close()
  }, [])

  return (
    <div id="main" className="relative h-full w-full px-12 py-8">
      <TxProgress
        hash={txId}
        networkIdOrHash={networkId}
        wording="transfer"
        className="pt-24"
        onClose={handleClose}
        onReplacementComplete={gotoProgress}
      />
    </div>
  )
}
