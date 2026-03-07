import { Button } from "@ui/talisman-ui/components/Button"
import { Drawer } from "@ui/talisman-ui/components/Drawer"
import { useTranslation } from "react-i18next"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

type BittensorSelectStakeDrawerProps = {
  containerId: string | undefined
}

export const BittensorSelectStakeDrawer = ({ containerId }: BittensorSelectStakeDrawerProps) => {
  const { t } = useTranslation()
  const { setStakeType, stakeTypeDrawer } = useBittensorBondWizard()

  return (
    <Drawer anchor="bottom" isOpen={stakeTypeDrawer.isOpen} containerId={containerId}>
      <div className="flex w-full flex-col items-center gap-8 rounded-t-xl bg-grey-850 p-12">
        <div className="font-bold text-body">{t("Select the staking type")}</div>
        <p className="text-body-secondary text-sm">
          {t(
            "Choose either to stake on root or on a subnet. Root staking lets you earn rewards in TAO. Subnet staking converts your TAO into subnet alpha tokens, and your rewards are also paid in these tokens."
          )}
        </p>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button
            onClick={() => {
              setStakeType("root")
            }}
          >
            Root Staking
          </Button>
          <Button
            className="px-2"
            primary
            onClick={() => {
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
