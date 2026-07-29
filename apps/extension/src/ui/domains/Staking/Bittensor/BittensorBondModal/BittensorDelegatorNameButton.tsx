import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useCombinedBittensorValidatorsData } from "../../hooks/bittensor/useCombinedBittensorValidatorsData"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"
import { BittensorSelectButton } from "./BittensorSelectButton"

export const BittensorDelegatorNameButton: FC<{
  hotkey: string | undefined | null
  isDisabled?: boolean
  className?: string
}> = ({ hotkey, isDisabled, className }) => {
  const { t } = useTranslation()
  const { netuid, networkId } = useBittensorBondWizard()
  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(networkId, netuid)

  const validator = useMemo(
    () => combinedValidatorsData.find((data) => data.hotkey === hotkey),
    [combinedValidatorsData, hotkey]
  )

  const label = useMemo(() => {
    const poolName = validator?.name || (hotkey ? shortenAddress(hotkey, 8, 8) : undefined)
    return poolName ?? t("Validator")
  }, [validator, hotkey, t])

  return (
    <BittensorSelectButton
      isDisabled={isDisabled}
      label={label}
      nextStep="select-delegate"
      className={className}
    />
  )
}
