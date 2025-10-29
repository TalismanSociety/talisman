import { useMemo } from "react"

import { useCombinedBittensorValidatorsData } from "../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"
import { BittensorSelectButton } from "./BittensorSelectButton"

type BittensorDelegatorNameButtonProps = {
  hotkey: string | number | undefined | null
  isDisabled?: boolean
}

export const BittensorDelegatorNameButton = ({
  hotkey,
  isDisabled,
}: BittensorDelegatorNameButtonProps) => {
  const { netuid } = useBittensorBondWizard()
  const { combinedValidatorsData, isLoading, isError } = useCombinedBittensorValidatorsData(netuid)

  const selectedPool = combinedValidatorsData.find((data) => data.hotkey === hotkey)

  const defaultPoolName = "Validator"

  const poolName = selectedPool?.name

  const label = useMemo(
    () => (isError || !poolName ? defaultPoolName : poolName),
    [isError, poolName],
  )

  return (
    <BittensorSelectButton
      isLoading={isLoading}
      isDisabled={isDisabled}
      label={label}
      nextStep="select-delegate"
    />
  )
}
