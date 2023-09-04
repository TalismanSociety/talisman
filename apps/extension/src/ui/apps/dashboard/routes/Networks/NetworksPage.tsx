import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { PlusIcon } from "@talismn/icons"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { PillButton } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { ANALYTICS_PAGE } from "./analytics"
import { ChainsList } from "./ChainsList"
import { EvmNetworksList } from "./EvmNetworksList"
import { useNetworkType } from "./useNetworkType"

export const NetworksPage = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()

  const [networkType, setNetworkType] = useNetworkType()

  const handleAddNetworkClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add network button",
    })
    navigate(`./add?type=${networkType}`)
  }, [navigate, networkType])

  return (
    <DashboardLayout
      analytics={ANALYTICS_PAGE}
      centered
      withBack
      backTo="/settings/networks-tokens"
    >
      <HeaderBlock title={t("Manage Networks")} text={t("View, edit and delete custom networks")} />
      <Spacer large />
      <div className="flex justify-end gap-4">
        <ProviderTypeSwitch
          className="text-xs [&>div]:h-full"
          defaultProvider={networkType}
          onChange={setNetworkType}
        />

        <div className="flex-grow" />

        <EnableTestnetPillButton className="h-16" />
        <PillButton icon={PlusIcon} className="h-16" onClick={handleAddNetworkClick}>
          {t("Add network")}
        </PillButton>
      </div>
      <Spacer small />
      {networkType === "polkadot" ? <ChainsList /> : <EvmNetworksList />}
    </DashboardLayout>
  )
}
