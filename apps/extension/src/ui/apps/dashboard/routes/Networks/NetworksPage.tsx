import { bind } from "@react-rxjs/core"
import { InfoIcon, PlusIcon } from "@talismn/icons"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
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
import { activeNetworksState$, balancesHydrate$ } from "@ui/state"

import { ANALYTICS_PAGE } from "./analytics"
import { NetworksList } from "./NetworksList"
import { PlatformOption, usePlatformOptions } from "./usePlatformOptions"

export const NetworksPage = () => {
  const { t } = useTranslation()
  usePreload()

  const navigate = useNavigate()
  const location = useLocation()

  useAnalyticsPageView(ANALYTICS_PAGE)

  const handleAddNetworkClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add network button",
    })
    navigate("./add", { state: { platform: location.state?.platform } })
  }, [location.state?.platform, navigate])

  return (
    <DashboardLayout sidebar="settings">
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
      <Content />
    </DashboardLayout>
  )
}

const NoticeTooltip: FC = () => {
  const { t } = useTranslation()

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

const [usePreload] = bind(combineLatest([balancesHydrate$, activeNetworksState$]))

const Content = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [platform, setPlatform, platformOptions] = usePlatformOptions(
    location.state?.platform as PlatformOption,
  )
  const [search, setSearch] = useState(() => (location.state?.search as string) ?? "")
  const [activeOnly, setActiveOnly] = useState(
    () => (location.state?.activeOnly as boolean) ?? false,
  )

  useEffect(() => {
    navigate(location.pathname, {
      replace: true,
      state: { platform, search, activeOnly },
    })
  }, [activeOnly, location.pathname, navigate, platform, search])

  return (
    <>
      <Spacer small />
      <div className="flex justify-end gap-4" data-testid="platform-options-switch">
        <OptionSwitch
          options={platformOptions.map(({ value, label }) => [value, label] as const)}
          className="text-xs [&>div]:h-full"
          defaultOption={platform}
          onChange={setPlatform}
        />

        <div className="flex-grow" />

        <TogglePill
          label={t("Active only")}
          checked={!search && activeOnly}
          onChange={() => setActiveOnly((prev) => !prev)}
          disabled={!!search}
        />
      </div>
      <Spacer small />
      <div className="flex gap-4">
        <SearchInput
          initialValue={search}
          onChange={setSearch}
          placeholder={t("Search networks")}
        />
      </div>
      <Spacer small />
      <NetworksList platform={platform} activeOnly={activeOnly} search={search} />
    </>
  )
}
