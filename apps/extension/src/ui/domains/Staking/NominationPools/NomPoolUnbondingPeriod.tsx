import { DotNetworkId } from "@talismn/chaindata-provider"
import { formatDistance } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"

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
    [data, t, locale],
  )

  if (isLoading)
    return <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">28 Days</div>

  if (isError) return <div className="text-alert-warn">{t("Unable to fetch unbonding period")}</div>

  return <>{display}</>
}
