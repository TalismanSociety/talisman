import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { format } from "date-fns"
import { type FC, useMemo } from "react"

export const TxHistoryDetailsTimestamp: FC<{
  timestamp: number
}> = ({ timestamp }) => {
  const locale = useDateFnsLocale()

  return useMemo(() => format(new Date(timestamp), "PPpp", { locale }), [timestamp, locale])
}
