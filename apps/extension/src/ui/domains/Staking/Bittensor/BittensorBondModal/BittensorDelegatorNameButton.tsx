import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useCombinedBittensorValidatorsData } from "../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"
import { BittensorSelectButton } from "./BittensorSelectButton"

type BittensorDelegatorNameButtonProps = {
  hotkey: string | undefined | null
  isDisabled?: boolean
}

export const BittensorDelegatorNameButton = ({
  hotkey,
  isDisabled,
}: BittensorDelegatorNameButtonProps) => {
  const { t } = useTranslation()
  const { netuid } = useBittensorBondWizard()
  const { combinedValidatorsData, isError } = useCombinedBittensorValidatorsData(netuid)

  const selectedPool = useMemo(
    () => combinedValidatorsData.find((data) => data.hotkey === hotkey),
    [combinedValidatorsData, hotkey],
  )

  const label = useMemo(() => {
    const poolName = selectedPool?.name
    return isError || !poolName ? t("Validator") : poolName
  }, [isError, selectedPool?.name, t])

  return <BittensorSelectButton isDisabled={isDisabled} label={label} nextStep="select-delegate" />
}
