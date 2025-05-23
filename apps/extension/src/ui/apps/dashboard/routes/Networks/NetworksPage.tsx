import { bind } from "@react-rxjs/core"
import { InfoIcon, PlusIcon } from "@talismn/icons"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { combineLatest } from "rxjs"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { SearchInput } from "@talisman/components/SearchInput"
import { Spacer } from "@talisman/components/Spacer"
import { TogglePill } from "@talisman/components/TogglePill"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { activeChainsState$, activeEvmNetworksState$, balancesHydrate$ } from "@ui/state"

import { ANALYTICS_PAGE } from "./analytics"
import { ChainsList } from "./ChainsList"
import { EvmNetworksList } from "./EvmNetworksList"
import { useNetworksType } from "./useNetworksType"

const NoticeTooltip: FC = () => {
  const { t } = useTranslation("admin")

  return (
    <Tooltip>
      <TooltipTrigger className="align-text-top">
        <InfoIcon />
      </TooltipTrigger>
      <TooltipContent>
        {t(
          "Ethereum network settings are taken from the community maintained Ethereum Lists Github repository.",
        )}
        <br />
        {t("Talisman does not curate or control which RPCs are used for these networks.")}
      </TooltipContent>
    </Tooltip>
  )
}

const [usePreload] = bind(
  combineLatest([balancesHydrate$, activeChainsState$, activeEvmNetworksState$]),
)

const Content = () => {
  const { t } = useTranslation("admin")
  usePreload()
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
  const [activeOnly, setActiveOnly] = useState(false)

  return (
    <>
      <div className="flex w-full justify-between">
        <HeaderBlock
          title={t("Manage Networks")}
          text={
            <>
              {t("Add, enable and disable networks")} <NoticeTooltip />
            </>
          }
        />
        <Button primary iconLeft={PlusIcon} small onClick={handleAddNetworkClick}>
          {t("Add network")}
        </Button>
      </div>
      <Spacer small />
      <div className="flex justify-end gap-4">
        <OptionSwitch
          options={[
            ["ethereum", t("Ethereum")],
            ["polkadot", t("Polkadot")],
          ]}
          className="text-xs [&>div]:h-full"
          defaultOption={networksType}
          onChange={setNetworksType}
        />

        <div className="flex-grow" />

        <TogglePill
          label={t("Active only")}
          checked={activeOnly}
          onChange={() => setActiveOnly((prev) => !prev)}
          disabled={!!search}
        />
      </div>
      <Spacer small />
      <div className="flex gap-4">
        <SearchInput onChange={setSearch} placeholder={t("Search networks")} />
      </div>
      <Spacer small />
      {networksType === "polkadot" ? (
        <ChainsList activeOnly={activeOnly} search={search} />
      ) : (
        <EvmNetworksList activeOnly={activeOnly} search={search} />
      )}
    </>
  )
}

export const NetworksPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
