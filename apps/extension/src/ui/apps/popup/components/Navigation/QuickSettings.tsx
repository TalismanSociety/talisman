import { languages } from "@common/i18nConfig"
import { Transition, TransitionChild } from "@headlessui/react"
import { ArrowUpRightIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Toggle } from "@ui/components/Toggle"
import { currencyConfig } from "@ui/domains/Asset/currencyConfig"
import { useFavoriteCurrencies } from "@ui/hooks/useFavoriteCurrencies"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { useSetting } from "@ui/state/settings"
import { type FC, type ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AutoLockDrawer, useAutoLockDrawerOpenClose } from "./AutoLockDrawer"
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

  return (
    <Transition show={isOpen} appear>
      <TransitionChild
        as="div"
        className="absolute top-0 left-0 z-20 h-full w-full cursor-pointer bg-black/55 backdrop-blur-[2px]"
        role="presentation"
        onClick={close}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      ></TransitionChild>
    </Transition>
  )
}

export const QuickSettingsModal: FC = () => {
  const { t } = useTranslation()
  const { isOpen } = useQuickSettingsOpenClose()

  return (
    <Transition show={isOpen} appear>
      <TransitionChild
        as="div"
        className="flex w-full flex-col gap-8 rounded border border-grey-800 bg-black/90 px-12 py-8"
        enter="ease-out duration-200"
        enterFrom="opacity-0 scale-90"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div className="flex w-full items-center justify-between">
          <div className="font-bold text-body text-md">{t("Settings")}</div>
          <AllSettingsButton />
        </div>
        <div className="h-0.5 w-full bg-grey-800"></div>
        <div className="flex w-full flex-col">
          <LanguageRow />
          <CurrenciesRow />
          <AutoLockRow />
          <HideBalancesRow />
          <HideSmallBalancesRow />
        </div>
      </TransitionChild>
    </Transition>
  )
}

const SettingRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => {
  return (
    <div className="flex h-16 w-full items-center justify-between gap-1 text-body-secondary text-sm">
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
        className="font-bold text-grey-300 text-sm hover:text-body"
        onClick={open}
      >
        {current}
      </button>
      <LanguageDrawer />
    </SettingRow>
  )
}

const AutoLockRow = () => {
  const { t } = useTranslation()
  const { open } = useAutoLockDrawerOpenClose()

  const [autoLockMinutes] = useSetting("autoLockMinutes")
  const display = useMemo(() => {
    if (autoLockMinutes === 0) return t("Disabled")
    if (autoLockMinutes === 1) return t("{{minutes}} minute", { minutes: autoLockMinutes })
    return t("{{minutes}} minutes", { minutes: autoLockMinutes })
  }, [autoLockMinutes, t])

  return (
    <SettingRow label={t("Auto-lock timer")}>
      <button
        type="button"
        className="font-bold text-grey-300 text-sm hover:text-body"
        onClick={open}
      >
        {display}
      </button>
      <AutoLockDrawer />
    </SettingRow>
  )
}

const CurrenciesRow = () => {
  const { t } = useTranslation()
  const { open } = useCurrenciesDrawerOpenClose()
  const [favorites] = useFavoriteCurrencies()

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
            className="-ml-2 inline-block size-10 shrink-0 rounded-full border border-0.5 border-grey-800 align-middle"
            alt={currency}
            src={currencyConfig[currency]?.icon}
          />
        ))}
        {moreLabel && (
          <div className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-0.5 border-grey-800 bg-black align-middle text-[0.5625rem] text-body-secondary">
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
      className="flex items-center gap-1 rounded-sm bg-primary/5 p-4 text-primary text-xs hover:bg-primary/10"
      onClick={handleClick}
    >
      <div>{t("All settings")}</div>
      <ArrowUpRightIcon className="size-6" />
    </button>
  )
}
