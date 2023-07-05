import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { IconChevron, PlusIcon } from "@talisman/theme/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import sortBy from "lodash/sortBy"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ListButton, PillButton } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const TestnetPill = () => {
  const { t } = useTranslation("admin")
  return (
    <div className="bg-alert-warn/10 text-alert-warn inline-block rounded p-4 text-xs font-light">
      {t("Testnet")}
    </div>
  )
}

const CustomPill = () => {
  const { t } = useTranslation("admin")
  return (
    <div className="bg-primary/10 text-primary inline-block rounded p-4 text-xs font-light">
      {t("Custom")}
    </div>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Networks",
}

const NetworksList = () => {
  const [useTestnets] = useSetting("useTestnets")
  const navigate = useNavigate()
  const { evmNetworks } = useEvmNetworks(useTestnets)
  const sortedNetworks = useMemo(() => sortBy(evmNetworks, "name"), [evmNetworks])

  const handleNetworkClick = useCallback(
    (network: EvmNetwork | CustomEvmNetwork) => () => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: "network settings button",
        properties: {
          networkId: network.id.toString(),
        },
      })
      navigate(`./${network.id}`)
    },
    [navigate]
  )

  if (!sortedNetworks) return null

  return (
    <div className="flex flex-col gap-4">
      {sortedNetworks.map((network) => (
        <ListButton key={network.id} role="button" onClick={handleNetworkClick(network)}>
          <ChainLogo className="rounded-full text-xl" id={network.id} />
          <div className="text-body grow">{network.name}</div>
          {network.isTestnet && <TestnetPill />}
          {isCustomEvmNetwork(network) && <CustomPill />}
          <IconChevron className="text-lg transition-none" />
        </ListButton>
      ))}
    </div>
  )
}

export const NetworksPage = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()

  const handleAddNetworkClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add network button",
    })
    navigate("./add")
  }, [navigate])

  return (
    <DashboardLayout analytics={ANALYTICS_PAGE} withBack centered backTo="/settings">
      <HeaderBlock
        title={t("Ethereum Networks")}
        text={t("Add or delete custom Ethereum networks")}
      />
      <div className="mb-16 mt-24 flex justify-end gap-4">
        <EnableTestnetPillButton className="h-16" />
        <PillButton icon={PlusIcon} size="xs" className="h-16" onClick={handleAddNetworkClick}>
          {t("Add network")}
        </PillButton>
      </div>
      <NetworksList />
    </DashboardLayout>
  )
}
