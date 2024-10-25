import { Duration, formatDuration } from "date-fns"
import { ChainId } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"

import { useStakingBondingDuration } from "./useStakingBondingDuration"

export const StakingUnbondingPeriod: FC<{ chainId: ChainId | null | undefined }> = ({
  chainId,
}) => {
  const { t } = useTranslation()
  const { data: duration, isLoading } = useStakingBondingDuration(chainId)
  const locale = useDateFnsLocale()

  const display = useMemo(
    () =>
      duration
        ? formatDuration(durationFromMs(Number(duration)), {
            locale,
          })
        : t("N/A"),
    [duration, locale, t],
  )

  if (isLoading)
    return <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">28 Days</div>

  return <>{display}</>
}

const durationFromMs = (ms: number): Duration => {
  // returns the best possible looking duration object from ms
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const result = {
    seconds: seconds % 60,
    minutes: minutes % 60,
    hours: hours % 24,
    days: days,
  }

  return result
}
