import {
  BellIcon,
  ChevronRightIcon,
  CoinsIcon,
  DollarSignIcon,
  EyeOffIcon,
  FlagIcon,
  RefreshCwIcon,
  ToolIcon,
  UsbIcon,
  UserIcon,
} from "@talismn/icons"
import { isNotNil } from "@talismn/util"
import { LedgerTransportType } from "extension-core"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, CtaButton, Dropdown, Toggle } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { AnalyticsPage } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useRuntimeReload } from "@ui/hooks/useRuntimeReload"
import { useSetting } from "@ui/state"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "General",
}

export const GeneralPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)

const Content = () => {
  const { t } = useTranslation()
  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const [hideDust, setHideDust] = useSetting("hideDust")
  const [identiconType, setIdenticonType] = useSetting("identiconType")
  const [allowNotifications, setAllowNotifications] = useSetting("allowNotifications")
  const [hasRuntimeReloadFn, runtimeReload] = useRuntimeReload(ANALYTICS_PAGE)
  const [developerMode, setDeveloperMode] = useSetting("developerMode")

  return (
    <>
      <HeaderBlock title={t("General")} text={t("General settings")} />
      <div className="mt-16 flex flex-col gap-4">
        {hasRuntimeReloadFn ? (
          <Setting
            iconLeft={RefreshCwIcon}
            title={t("Reload Talisman")}
            subtitle={t("Close and restart Talisman, this can help to resolve error states")}
          >
            <Button primary small onClick={runtimeReload}>
              {t("Reload")}
            </Button>
          </Setting>
        ) : null}
        <Setting
          iconLeft={BellIcon}
          title={t("Allow notifications")}
          subtitle={t("Allow Talisman to send you notifications about transactions in progress")}
        >
          <Toggle
            checked={allowNotifications}
            onChange={(e) => setAllowNotifications(e.target.checked)}
          />
        </Setting>
        <Setting
          iconLeft={EyeOffIcon}
          title={t("Blur balances")}
          subtitle={t("Conceal your portfolio and account balances")}
        >
          <Toggle checked={hideBalances} onChange={(e) => setHideBalances(e.target.checked)} />
        </Setting>
        <Setting
          iconLeft={CoinsIcon}
          title={t("Hide small balances")}
          subtitle={t("Hide tokens with a balance below US$1")}
        >
          <Toggle checked={hideDust} onChange={(e) => setHideDust(e.target.checked)} />
        </Setting>
        <CtaButton
          iconLeft={FlagIcon}
          iconRight={ChevronRightIcon}
          title={t("Language")}
          subtitle={t("Change the wallet display language")}
          to={`/settings/general/language`}
        />
        <CtaButton
          iconLeft={DollarSignIcon}
          iconRight={ChevronRightIcon}
          title={t("Currency")}
          subtitle={t("Set currencies for viewing your portolio value")}
          to={`/settings/general/currency`}
        />
        <Setting
          iconLeft={UserIcon}
          title={t("Account avatars")}
          subtitle={t("Choose between the Talisman orbs or Polkadot.js identicons")}
        >
          <AvatarTypeSelect selectedType={identiconType} onChange={setIdenticonType} />
        </Setting>
        <Setting
          iconLeft={ToolIcon}
          title={t("Developer mode")}
          subtitle={t("Allow connecting to dapps with watch-only accounts")}
        >
          <Toggle checked={developerMode} onChange={(e) => setDeveloperMode(e.target.checked)} />
        </Setting>
        <Setting
          iconLeft={UsbIcon}
          title={t("Ledger interface")}
          subtitle={t("Select which connection type to use with Ledger hardware wallets")}
        >
          <LedgerTransportTypeSelect />
        </Setting>
      </div>
    </>
  )
}

export const LedgerTransportTypeSelect = () => {
  const { t } = useTranslation()
  const [ledgerTransportType, setLedgerTransportType] = useSetting("ledgerTransportType")

  const ledgerTransportTypeItems = useMemo(
    () =>
      [
        getIsLedgerCapable("hid") ? { value: "hid", label: t("HID") } : null,
        getIsLedgerCapable("usb") ? { value: "usb", label: t("USB") } : null,
      ].filter(isNotNil) as { value: LedgerTransportType; label: string }[],
    [t],
  )

  const ledgerTransportTypeValue = useMemo(() => {
    return (
      ledgerTransportTypeItems.find((item) => item.value === ledgerTransportType) ||
      ledgerTransportTypeItems[0]
    )
  }, [ledgerTransportType, ledgerTransportTypeItems])

  if (ledgerTransportTypeItems.length === 0)
    return <div className="text-body-disabled w-[12rem] text-right">{t("Unavailable")}</div>

  return (
    <Dropdown
      items={ledgerTransportTypeItems}
      propertyKey="value"
      value={ledgerTransportTypeValue}
      onChange={(v) => setLedgerTransportType(v!.value)}
      renderItem={(item) => item.label}
    />
  )
}
