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
      <div className="bg-grey-850 flex w-full flex-col items-center gap-8 rounded-t-xl p-12">
        <div className="text-body font-bold">{t("Select the staking type")}</div>
        <p className="text-body-secondary text-sm">
          {t(
            "Subnet DTAO is a new way of staking your assets through Bittensor’s Dynamic TAO model where you get Alpha tokens as part of staking. You still can safely stake your assets directly to Root (Subnet 0).",
          )}
        </p>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={onDismiss}>Root Staking</Button>
          <Button
            className="px-2"
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
