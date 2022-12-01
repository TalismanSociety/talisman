import { useCallback, useEffect } from "react"
import { Layout } from "../layout"
import { ImportMethodType, useOnboard } from "../context"
import { useNavigate } from "react-router-dom"
import { OnboardCta } from "../components/OnboardCta"
import { FileTextIcon, KeyIcon, MessageCircleIcon, UsbIcon } from "@talisman/theme/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 2a - Import method",
}

export const ImportMethodPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()
  const { data, updateData } = useOnboard()

  useEffect(() => {
    if (!data.importAccountType) navigate("/import", { replace: true })
  }, [data, navigate])

  const handleClick = useCallback(
    (importMethodType: ImportMethodType) => () => {
      updateData({ importMethodType })
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: `Import wallet method ${importMethodType}`,
        properties: {
          importAccountType: data.importAccountType,
          importMethodType,
        },
      })
      navigate(importMethodType === "mnemonic" ? "/import-seed" : "/password")
    },
    [data.importAccountType, navigate, updateData]
  )

  if (!data.importAccountType) return null

  return (
    <Layout withBack analytics={ANALYTICS_PAGE}>
      <div className="mx-0 w-full max-w-[87rem] self-center text-center">
        <div className="my-[6rem] text-xl">
          How would you like to import your{" "}
          {data.importAccountType === "ethereum" ? "Ethereum" : "Polkadot"} wallet?
        </div>
        <div className="inline-grid grid-cols-2 gap-12">
          <OnboardCta
            onClick={handleClick("mnemonic")}
            icon={MessageCircleIcon}
            title="Recovery phrase"
            subtitle="Restore Talisman or import your seed phrase from any wallet"
          />
          <OnboardCta
            onClick={handleClick("ledger")}
            icon={UsbIcon}
            title="Ledger"
            subtitle="Connect your Ledger account"
          />
          {data.importAccountType === "sr25519" && (
            <OnboardCta
              onClick={handleClick("json")}
              icon={FileTextIcon}
              title="JSON file"
              subtitle="Import account from JSON file"
            />
          )}
          {data.importAccountType === "ethereum" && (
            <OnboardCta
              onClick={handleClick("private-key")}
              icon={KeyIcon}
              title="Private key"
              subtitle="Import an account from a private key"
            />
          )}
        </div>
      </div>
    </Layout>
  )
}
