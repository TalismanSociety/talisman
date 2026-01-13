import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { formatDistanceToNowStrict, type Locale } from "date-fns"
import type { TFunction } from "i18next"
import { type FC, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

export const DistanceToNow: FC<{ timestamp: number }> = ({ timestamp }) => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()
  const [text, setText] = useState(() => displayDistanceToNow(timestamp, locale, t))

  useEffect(() => {
    const interval = setInterval(() => {
      setText(displayDistanceToNow(timestamp, locale, t))
    }, 10_000)

    return () => clearInterval(interval)
  }, [locale, t, text, timestamp])

  return <>{text}</>
}

const displayDistanceToNow = (timestamp: number, locale: Locale, t: TFunction) =>
  Date.now() - timestamp > 60_000
    ? formatDistanceToNowStrict(timestamp, { addSuffix: true, locale })
    : t("Just now")
