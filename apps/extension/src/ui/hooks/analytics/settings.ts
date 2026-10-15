import { toDurationMs } from "@common/analytics/schema"
import { appFlagChangeOf, settingChangeOf } from "@common/analytics/settings"
import type { AppStoreData } from "@core/domains/app/store.app"
import type { SettingsStoreData } from "@core/domains/app/store.settings"
import { track } from "@ui/api/track"
import i18next from "i18next"
import { isEqual } from "lodash-es"

export const reportSettingWrite = <K extends keyof SettingsStoreData>(
  key: K,
  previous: SettingsStoreData[K],
  next: SettingsStoreData[K]
) => {
  if (isEqual(previous, next)) return
  if (key === "autoLockMinutes")
    return track("auto_lock_changed", { timeout_ms: toDurationMs(Number(next) * 60_000) })
  const change = settingChangeOf(key, next)
  if (change) track("setting_changed", change)
}

export const reportAppFlagWrite = <K extends keyof AppStoreData>(
  key: K,
  previous: AppStoreData[K],
  next: AppStoreData[K]
) => {
  if (isEqual(previous, next)) return
  const change = appFlagChangeOf(key, next)
  if (change) track("setting_changed", change)
}

export const changeLanguage = async (language: string) => {
  if (language === i18next.language) return
  await i18next.changeLanguage(language)
  track("language_changed", { language_code: language })
}
