import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import {
  FileTextIcon,
  KeyIcon,
  MessageCircleIcon,
  ParitySignerIcon,
  UsbIcon,
} from "@talisman/theme/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import { OnboardCta } from "../components/OnboardCta"
import { ImportMethodType, useOnboard } from "../context"
import { Layout } from "../layout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 2a - Import method",
}

export const ImportMethodPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()
  const { data, updateData, isResettingWallet } = useOnboard()

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
          isResettingWallet,
        },
      })
      navigate(importMethodType === "mnemonic" ? "/import-seed" : "/password")
    },
    [data.importAccountType, navigate, updateData, isResettingWallet]
  )

  const disableLedger = useMemo(() => !getIsLedgerCapable(), [])

  if (!data.importAccountType) return null

  return (
    <Layout withBack={!isResettingWallet} analytics={ANALYTICS_PAGE}>
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
            subtitle="Import your seed phrase from any wallet"
          />
          <OnboardCta
            onClick={handleClick("ledger")}
            icon={UsbIcon}
            title="Ledger"
            subtitle={
              disableLedger
                ? "Ledger is not supported on your browser. Try again with another browser"
                : "Connect your Ledger account"
            }
            disabled={disableLedger}
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
          {data.importAccountType === "sr25519" && (
            <OnboardCta
              onClick={handleClick("qr")}
              icon={ParitySignerIcon}
              title="Parity signer"
              subtitle="Connect your Parity Signer account"
            />
          )}
        </div>
        <div className="text-body-secondary my-24">
          Talisman will provide you with a Polkadot and Ethereum account by default
        </div>
      </div>
    </Layout>
  )
}
