import { formatDistanceToNowStrict, Locale } from "date-fns"
import { TFunction } from "i18next"
import { FC, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"

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
