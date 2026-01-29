import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { format, formatDistanceToNowStrict, type Locale } from "date-fns"
import type { TFunction } from "i18next"
import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const DistanceToNow: FC<{ timestamp: number | string }> = ({ timestamp }) => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()
  const [text, setText] = useState(() => displayDistanceToNow(timestamp, locale, t))

  const exactTime = useMemo(
    () => format(new Date(timestamp), "PPpp", { locale }), // e.g. "Jan 29, 2026, 3:45:30 PM"
    [timestamp, locale]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    const interval = setInterval(() => {
      setText(displayDistanceToNow(timestamp, locale, t))
    }, 10_000)

    return () => clearInterval(interval)
  }, [locale, t, text, timestamp])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{text}</span>
      </TooltipTrigger>
      <TooltipContent>{exactTime}</TooltipContent>
    </Tooltip>
  )
}

const displayDistanceToNow = (timestamp: number | string, locale: Locale, t: TFunction) => {
  const date = new Date(timestamp)
  return Date.now() - date.getTime() > 60_000
    ? formatDistanceToNowStrict(date, { addSuffix: true, locale })
    : t("Just now")
}
