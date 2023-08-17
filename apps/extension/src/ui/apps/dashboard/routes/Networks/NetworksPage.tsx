import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { Chain, CustomChain } from "@talismn/chaindata-provider"
import { ChevronRightIcon, PlusIcon } from "@talismn/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import { isCustomChain } from "@ui/util/isCustomChain"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import sortBy from "lodash/sortBy"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ListButton, PillButton } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { useNetworkType } from "./useNetworkType"

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

const ChainsList = () => {
  const [useTestnets] = useSetting("useTestnets")
  const navigate = useNavigate()
  const { chains } = useChains(useTestnets)
  const sortedChains = useMemo(() => sortBy(chains, "name"), [chains])

  const handleChainClick = useCallback(
    (chain: Chain | CustomChain) => () => {
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Goto",
        action: "chain settings button",
        properties: {
          chainId: chain.id,
        },
      })
      navigate(`./${chain.id}?type=polkadot`)
    },
    [navigate]
  )

  if (!sortedChains) return null

  return (
    <div className="flex flex-col gap-4">
      {sortedChains.map((chain) => (
        <ListButton key={chain.id} role="button" onClick={handleChainClick(chain)}>
          <ChainLogo className="rounded-full text-xl" id={chain.id} />
          <div className="text-body grow">{chain.name}</div>
          {chain.isTestnet && <TestnetPill />}
          {isCustomChain(chain) && <CustomPill />}
          <ChevronRightIcon className="text-lg transition-none" />
        </ListButton>
      ))}
    </div>
  )
}

const EvmNetworksList = () => {
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
      navigate(`./${network.id}?type=ethereum`)
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
          <ChevronRightIcon className="text-lg transition-none" />
        </ListButton>
      ))}
    </div>
  )
}

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
        <ProviderTypeSwitch defaultProvider={networkType} onChange={setNetworkType} />

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
