import { enUS, ko, Locale, ru, zhCN } from "date-fns/locale"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

const I18_TO_DATEFNS_LOCALE_MAP: Record<string, Locale> = {
  en: enUS,
  kr: ko,
  ru,
  zh: zhCN,
}

export const useDateFnsLocale = () => {
  const { i18n } = useTranslation()

  return useMemo(() => I18_TO_DATEFNS_LOCALE_MAP[i18n.language ?? "en"], [i18n.language])
}
