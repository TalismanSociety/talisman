import HeaderBlock from "@talisman/components/HeaderBlock"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkForm } from "@ui/domains/Ethereum/Networks/NetworkForm"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Network",
}

export const NetworkPage = () => {
  const { t } = useTranslation("settings")
  const navigate = useNavigate()
  const { id: evmNetworkId } = useParams<"id">()

  useAnalyticsPageView(ANALYTICS_PAGE, {
    id: evmNetworkId,
    mode: evmNetworkId ? t("Edit") : t("Add"),
  })

  const handleSubmitted = useCallback(() => {
    navigate("/networks")
  }, [navigate])

  return (
    <Layout analytics={ANALYTICS_PAGE} withBack centered>
      <HeaderBlock
        title={t("{{editMode}} EVM Network", { editMode: evmNetworkId ? t("Edit") : t("Add") })}
        text={
          <Trans t={t}>
            Only ever add RPCs you trust.
            <br />
            RPCs will automatically cycle in the order of priority defined here in case of any
            errors.
          </Trans>
        }
      />
      <NetworkForm evmNetworkId={evmNetworkId} onSubmitted={handleSubmitted} />
    </Layout>
  )
}
