import { format } from "date-fns"
import { FC, useMemo } from "react"

import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"

export const TxHistoryDetailsTimestamp: FC<{
  timestamp: number
}> = ({ timestamp }) => {
  const locale = useDateFnsLocale()

  return useMemo(() => format(new Date(timestamp), "PPpp", { locale }), [timestamp, locale])
}
