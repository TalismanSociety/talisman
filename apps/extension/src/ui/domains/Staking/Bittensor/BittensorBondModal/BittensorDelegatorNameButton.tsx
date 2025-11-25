import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { shortenAddress } from "@talisman/util/shortenAddress"

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
  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(netuid)

  const validator = useMemo(
    () => combinedValidatorsData.find((data) => data.hotkey === hotkey),
    [combinedValidatorsData, hotkey],
  )

  const label = useMemo(() => {
    const poolName = validator?.name || (hotkey ? shortenAddress(hotkey, 8, 8) : undefined)
    return poolName ?? t("Validator")
  }, [validator, hotkey, t])

  return <BittensorSelectButton isDisabled={isDisabled} label={label} nextStep="select-delegate" />
}
