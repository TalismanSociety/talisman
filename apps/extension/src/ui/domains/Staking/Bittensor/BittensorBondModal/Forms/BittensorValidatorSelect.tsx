import { BittensorValidatorPicker } from "@ui/domains/TaoDashboard/subnet/swap/BittensorValidatorPicker"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

export const BittensorValidatorSelect = () => {
  const { t } = useTranslation()
  const { hotkey, netuid, networkId, setStep, setHotkey } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()

  const handleSubmit = useCallback(
    (hotkey: string) => {
      setStep("form")
      setHotkey(hotkey)
    },
    [setHotkey, setStep]
  )

  if (netuid === null) return null

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          onCloseModal={close}
          title={t("Select Validator")}
          onBackClick={() => setStep("form")}
          withClose
        />
      }
    >
      <BittensorValidatorPicker
        networkId={networkId}
        netuid={netuid}
        hotkey={hotkey}
        onSelect={handleSubmit}
      />
    </BittensorModalLayout>
  )
}
