import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

type BittensorSelectStakeDrawerProps = {
  containerId: string | undefined
  isOpen: boolean
  onDismiss: () => void
}

export const BittensorSelectStakeDrawer = ({
  isOpen,
  containerId,
  onDismiss,
}: BittensorSelectStakeDrawerProps) => {
  const { t } = useTranslation()
  const { setStep, setStakeType } = useBittensorBondWizard()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId}>
      <div className="bg-grey-800 flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <div className="text-body font-bold">{t("Select the staking type")}</div>
        <div className="text-body-secondary text-xs">
          {t(
            "Subnet DTAO is a new way of staking your assets through Bittensor’s Dynamic TAO model where you get Alpha tokens as part of staking. You still can safely stake your assets directly to Root (Subnet 0).",
          )}
        </div>
        <div className="flex w-full items-center justify-between">
          <Button className="text-sm" onClick={onDismiss}>
            Root Staking
          </Button>
          <Button
            className="text-sm"
            primary
            onClick={() => {
              onDismiss()
              setStep("subnet-form")
              setStakeType("subnet")
            }}
          >
            Subnet DTAO
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
