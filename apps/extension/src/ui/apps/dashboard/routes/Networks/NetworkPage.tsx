import HeaderBlock from "@talisman/components/HeaderBlock"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkForm } from "@ui/domains/Ethereum/Networks/NetworkForm"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Network",
}

export const NetworkPage = () => {
  const navigate = useNavigate()
  const { id: evmNetworkId } = useParams<"id">()

  useAnalyticsPageView(ANALYTICS_PAGE, {
    id: evmNetworkId,
    mode: evmNetworkId ? "Edit" : "Add",
  })

  const handleSubmitted = useCallback(() => {
    navigate("/networks")
  }, [navigate])

  return (
    <Layout analytics={ANALYTICS_PAGE} withBack centered>
      <HeaderBlock
        title={`${evmNetworkId ? "Edit" : "Add"} EVM Network`}
        text={
          <>
            Only ever add RPCs you trust.
            <br />
            RPCs will automatically cycle in the order of priority defined here in case of any
            errors.
          </>
        }
      />
      <NetworkForm evmNetworkId={evmNetworkId} onSubmitted={handleSubmitted} />
    </Layout>
  )
}
