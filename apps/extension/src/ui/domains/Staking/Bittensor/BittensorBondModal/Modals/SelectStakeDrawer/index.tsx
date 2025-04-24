import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useBittensorBondWizard } from "../../../hooks/useBittensorBondWizard"

type SelectStakeDrawer = {
  containerId: string | undefined
  isOpen: boolean
  onDismiss: () => void
}

export const SelectStakeDrawer = ({ isOpen, containerId, onDismiss }: SelectStakeDrawer) => {
  const { t } = useTranslation()
  const { setStep } = useBittensorBondWizard()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId}>
      <div className="bg-grey-800 flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <div className="text-body font-bold">{t("Select the staking type")}</div>
        <div className="text-body-secondary text-xs">
          {t(
            "Subnet DTAO is staking a new way of staking your assets through Bittensor’s Dynamic TAO model where you get Alpha tokens as part of staking. You still can safely stake your assets directly to Root(Subnet 0).",
          )}
        </div>
        <div className="flex w-full items-center justify-between">
          <Button className="text-sm" onClick={onDismiss}>
            Root Staking
          </Button>
          <Button className="text-sm" primary onClick={() => setStep("root-form")}>
            Subnet DTAO
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
