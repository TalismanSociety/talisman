import { useMemo } from "react"

import { useCombinedBittensorValidatorsData } from "../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { BittensorSelectButton } from "./BittensorSelectButton"

type BittensorDelegatorNameButtonProps = {
  poolId: string | number | undefined | null
}

export const BittensorDelegatorNameButton = ({ poolId }: BittensorDelegatorNameButtonProps) => {
  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData()

  const selectedPool = combinedValidatorsData.find((data) => data.poolId === poolId)

  const defaultPoolName = "Validator"

  const poolName = selectedPool?.name

  const label = useMemo(
    () => (isError || !poolName ? defaultPoolName : poolName),
    [isError, poolName],
  )

  return <BittensorSelectButton isLoading={isLoading} label={label} nextStep="select" />
}
