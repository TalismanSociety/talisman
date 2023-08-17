import { AnalyticsPage } from "@ui/api/analytics"
import { NetworkForm } from "@ui/domains/Ethereum/Networks/NetworkForm"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useChain } from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { useNetworkType } from "./useNetworkType"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Network",
}

export const NetworkPage = () => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const { id } = useParams<"id">()

  const [networkType] = useNetworkType()

  useAnalyticsPageView(ANALYTICS_PAGE, {
    id,
    mode: id ? t("Edit") : t("Add"),
    networkType,
  })

  const chain = useChain(networkType === "polkadot" ? id : undefined)
  const evmNetwork = useEvmNetwork(networkType === "ethereum" ? id : undefined)

  const handleSubmitted = useCallback(
    () => navigate(`/networks?type=${networkType}`),
    [navigate, networkType]
  )

  return (
    <DashboardLayout analytics={ANALYTICS_PAGE} centered withBack>
      {chain && <>Chain Form</>}
      {evmNetwork && <NetworkForm evmNetworkId={id} onSubmitted={handleSubmitted} />}
    </DashboardLayout>
  )
}
