import { FadeIn } from "@talisman/components/FadeIn"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { SearchInput } from "@talisman/components/SearchInput"
import { Spacer } from "@talisman/components/Spacer"
import { InfoIcon, PlusIcon } from "@talismn/icons"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { FC, useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { PillButton } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { ANALYTICS_PAGE } from "./analytics"
import { ChainsList } from "./ChainsList"
import { EvmNetworksList } from "./EvmNetworksList"
import { useNetworksType } from "./useNetworksType"

const Notice: FC = () => {
  const { t } = useTranslation("admin")
  return (
    <div className="bg-grey-800 text-body-secondary flex items-center gap-8 rounded p-8 py-6">
      <div>
        <InfoIcon className="text-lg" />
      </div>
      <div className="grow text-sm">
        <Trans
          t={t}
          defaults="Ethereum network settings are taken from the community mantained <EthereumListsLink>Ethereum Lists</EthereumListsLink>. Talisman does not curate or control which RPCs are used for these networks."
          components={{
            EthereumListsLink: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                href="https://github.com/ethereum-lists/chains"
                target="_blank"
                className="text-grey-200 hover:text-body"
              ></a>
            ),
          }}
        />
      </div>
    </div>
  )
}
export const NetworksPage = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()

  const [networksType, setNetworksType] = useNetworksType()

  const handleAddNetworkClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add network button",
    })
    navigate("./add")
  }, [navigate])

  const [search, setSearch] = useState("")

  return (
    <DashboardLayout
      analytics={ANALYTICS_PAGE}
      centered
      withBack
      backTo="/settings/networks-tokens"
    >
      <HeaderBlock title={t("Manage Networks")} text={t("Add, enable and disable networks")} />
      <Spacer small />
      <Notice />
      <Spacer large />
      <div className="flex justify-end gap-4">
        <ProviderTypeSwitch
          className="text-xs [&>div]:h-full"
          defaultProvider={networksType}
          onChange={setNetworksType}
        />

        <div className="flex-grow" />

        <EnableTestnetPillButton className="h-16" />
        <PillButton icon={PlusIcon} className="h-16" onClick={handleAddNetworkClick}>
          {t("Add network")}
        </PillButton>
      </div>
      <Spacer small />
      <div className="flex gap-4">
        <SearchInput
          onChange={setSearch}
          placeholder={
            networksType === "polkadot" ? t("Search networks") : t("Search for more networks")
          }
        />
      </div>
      <Spacer small />
      {/* The `FadeIn` with the `key` is a dirty workaround for https://github.com/streamich/react-use/issues/2376 */}
      {/* Without it, when the search results change order, the `useIntersection` inside them bugs out and they turn blank */}
      <FadeIn key={search || "DEFAULT"}>
        {networksType === "polkadot" ? (
          <ChainsList search={search} />
        ) : (
          <EvmNetworksList search={search} />
        )}
      </FadeIn>
    </DashboardLayout>
  )
}
