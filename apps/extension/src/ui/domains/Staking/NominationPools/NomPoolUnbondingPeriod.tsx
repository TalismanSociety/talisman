import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { formatDistance } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useStakingBondingDuration } from "../hooks/nomPools/useStakingBondingDuration"

type NomPoolUnbondingPeriodProps = {
  chainId: DotNetworkId | null | undefined
}

export const NomPoolUnbondingPeriod = ({ chainId }: NomPoolUnbondingPeriodProps) => {
  const { data, isLoading, isError } = useStakingBondingDuration(chainId)
  const { t } = useTranslation()
  const locale = useDateFnsLocale()

  const display = useMemo(
    () => (data ? formatDistance(0, Number(data?.toString()) || 0, { locale }) : t("N/A")),
    [data, t, locale]
  )

  if (isLoading)
    return <div className="animate-pulse rounded-xs bg-grey-700 text-grey-700">28 Days</div>

  if (isError) return <div className="text-alert-warn">{t("Unable to fetch unbonding period")}</div>

  return <>{display}</>
}
