import { formatDistance } from "date-fns"
import { ChainId } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useStakingBondingDuration } from "./useStakingBondingDuration"

export const StakingUnbondingPeriod: FC<{ chainId: ChainId | null | undefined }> = ({
  chainId,
}) => {
  const { t } = useTranslation()

  let data,
    isLoading = false,
    duration = t("N/A")

  const hookMap = {
    nominationPool: useStakingBondingDuration,
  }
  switch (chainId) {
    case "bittensor":
      duration = t("None")
      break
    default:
      ;({ data, isLoading } = hookMap["nominationPool"](chainId))
      duration = formatDistance(0, Number(data?.toString()) || 0)
      break
  }

  const display = useMemo(() => (duration ? duration : t("N/A")), [duration, t])

  if (isLoading)
    return <div className="text-grey-700 bg-grey-700 rounded-xs animate-pulse">28 Days</div>

  return <>{display}</>
}
