import HeaderBlock from "@talisman/components/HeaderBlock"
import Layout from "@ui/apps/dashboard/layout"
import { useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { NetworkForm } from "@ui/domains/Ethereum/Networks/NetworkForm"
import { AnalyticsPage } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Network",
}

export const NetworkEdit = () => {
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
            Only ever add custom EVM compatible networks you trust.
            <br />
            RPCs will automatically cycle in case of errors, in the order defined here.
          </>
        }
      />
      <NetworkForm evmNetworkId={evmNetworkId} onSubmitted={handleSubmitted} />
    </Layout>
  )
}
