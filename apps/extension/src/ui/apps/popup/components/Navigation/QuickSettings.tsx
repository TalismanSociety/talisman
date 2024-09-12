import { ArrowUpRightIcon } from "@talismn/icons"
import { useAtomValue } from "jotai"
import { FC, ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Toggle } from "talisman-ui"

import { languages } from "@common/i18nConfig"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { selectableCurrenciesAtom } from "@ui/atoms"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { useSetting } from "@ui/hooks/useSettings"

import { CurrenciesDrawer, useCurrenciesDrawerOpenClose } from "./CurrenciesDrawer"
import { LanguageDrawer, useLanguageDrawerOpenClose } from "./LanguageDrawer"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Quick Settings",
  featureVersion: 3,
  page: "Portfolio",
}

export const useQuickSettingsOpenClose = () => useGlobalOpenClose("quick-settings")

export const QuickSettingsOverlay: FC = () => {
  const { isOpen, close } = useQuickSettingsOpenClose()

  if (!isOpen) return null

  // TODO proper animation in + out
  return (
    <div
      className="animate-fade-in-fast absolute left-0 top-0 z-20 h-full w-full cursor-pointer bg-black/55 backdrop-blur-[2px]"
      role="presentation"
      onClick={close}
    ></div>
  )
}

export const QuickSettingsModal: FC = () => {
  const { t } = useTranslation()
  const { isOpen } = useQuickSettingsOpenClose()

  if (!isOpen) return null

  return (
    <div className="border-grey-800 flex w-full flex-col gap-8 rounded border bg-black/90 px-12 py-8">
      <div className="flex w-full items-center justify-between">
        <div className="text-body text-md font-bold">{t("Settings")}</div>
        <AllSettingsButton />
      </div>
      <div className="bg-grey-800 h-0.5 w-full"></div>
      <div className="flex w-full flex-col">
        <LanguageRow />
        <CurrenciesRow />
        <HideBalancesRow />
        <HideSmallBalancesRow />
        <ShowTestnetsRow />
      </div>
    </div>
  )
}

const SettingRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => {
  return (
    <div className="text-body-secondary flex h-16 w-full items-center justify-between gap-1 text-sm">
      <div>{label}</div>
      {children}
    </div>
  )
}

const LanguageRow = () => {
  const { t, i18n } = useTranslation()
  const { open } = useLanguageDrawerOpenClose()

  const current = useMemo(() => languages[i18n.language] ?? "English", [i18n.language])

  return (
    <SettingRow label={t("Language")}>
      <button
        type="button"
        className="text-grey-300 hover:text-body text-sm font-bold"
        onClick={open}
      >
        {current}
      </button>
      <LanguageDrawer />
    </SettingRow>
  )
}

const CurrenciesRow = () => {
  const { t } = useTranslation()
  const { open } = useCurrenciesDrawerOpenClose()
  const favorites = useAtomValue(selectableCurrenciesAtom)

  const moreLabel = useMemo(() => {
    const moreItems = favorites.length - 3
    return moreItems > 0 ? `+${moreItems}` : null
  }, [favorites])

  return (
    <SettingRow label={t("Currencies")}>
      <button type="button" onClick={open} className="opacity-90 hover:opacity-100">
        {favorites.slice(0, 3).map((currency) => (
          <img
            key={currency}
            className="border-0.5 border-grey-800 -ml-2 inline-block size-10 shrink-0 rounded-full border  align-middle"
            alt={currency}
            src={currencyConfig[currency]?.icon}
          />
        ))}
        {moreLabel && (
          <div className="text-body-secondary border-0.5 border-grey-800 -ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-black align-middle text-[0.9rem]">
            {moreLabel}
          </div>
        )}
      </button>
      <CurrenciesDrawer />
    </SettingRow>
  )
}

const HideBalancesRow = () => {
  const { t } = useTranslation()
  const [hideBalances, setHideBalances] = useSetting("hideBalances")

  return (
    <SettingRow label={t("Blur balances")}>
      <Toggle
        variant="sm"
        defaultChecked={hideBalances}
        onChange={(e) => setHideBalances(e.target.checked)}
      />
    </SettingRow>
  )
}

const HideSmallBalancesRow = () => {
  const { t } = useTranslation()
  const [hideDust, setHideDust] = useSetting("hideDust")

  return (
    <SettingRow label={t("Hide small balances")}>
      <Toggle
        variant="sm"
        defaultChecked={hideDust}
        onChange={(e) => setHideDust(e.target.checked)}
      />
    </SettingRow>
  )
}

const ShowTestnetsRow = () => {
  const { t } = useTranslation()
  const [withTestnets, setWithTestnets] = useSetting("useTestnets")

  return (
    <SettingRow label={t("Show testnets")}>
      <Toggle
        variant="sm"
        defaultChecked={withTestnets}
        onChange={(e) => setWithTestnets(e.target.checked)}
      />
    </SettingRow>
  )
}

const AllSettingsButton = () => {
  const { t } = useTranslation()

  const handleClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "All Settings button",
    })
    api.dashboardOpen("/settings/general")
    window.close()
  }, [])

  return (
    <button
      type="button"
      className="text-primary bg-primary/5 hover:bg-primary/10 flex items-center gap-1 rounded-sm p-4 text-xs"
      onClick={handleClick}
    >
      <div>{t("All settings")}</div>
      <ArrowUpRightIcon className="size-6" />
    </button>
  )
}
