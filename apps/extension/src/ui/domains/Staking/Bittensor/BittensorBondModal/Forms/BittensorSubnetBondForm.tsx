import { Button } from "@ui/components/Button"
import { Checkbox } from "@ui/components/Checkbox"
import { Drawer } from "@ui/components/Drawer"
import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "@ui/domains/Staking/shared/ModalContent"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAppState } from "@ui/state/app"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { ROOT_NETUID } from "../../utils/constants"
import { BittensorBondFormBase } from "../BittensorBondFormBase"
import { BittensorSelectButton } from "../BittensorSelectButton"

export const BittensorSubnetBondForm = () => {
  const { t } = useTranslation()

  const { dtaoToken, netuid, stakeDirection } = useBittensorBondWizard()
  const [hideWarning, setHideWarning] = useAppState("hideBittensorSubnetStakeWarning")
  const [dontRemindAgain, setDontRemindAgain] = useState(false)
  const {
    isOpen: isSubnetRiskDrawerOpen,
    open: openSubnetRiskDrawer,
    close: closeSubnetRiskDrawer,
  } = useOpenClose()

  const handleCloseSubnetRiskDrawer = useCallback(() => {
    if (dontRemindAgain) setHideWarning(true)
    closeSubnetRiskDrawer()
  }, [closeSubnetRiskDrawer, dontRemindAgain, setHideWarning])

  useEffect(() => {
    if (
      stakeDirection !== "bond" ||
      typeof netuid !== "number" ||
      netuid === ROOT_NETUID ||
      hideWarning
    )
      return

    openSubnetRiskDrawer()
  }, [hideWarning, netuid, openSubnetRiskDrawer, stakeDirection])

  const SubnetStakeDetails = () => {
    return (
      <div className="flex items-center justify-between gap-8">
        <div className="whitespace-nowrap">{t("Select Subnet")}</div>
        <div className="truncate text-body">
          <BittensorSelectButton
            label={
              dtaoToken?.netuid
                ? dtaoToken.subnetName || t(`Subnet {{netuid}}`, dtaoToken)
                : t("Subnet")
            }
            nextStep="select-subnet"
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <BittensorBondFormBase BondTypeDetails={SubnetStakeDetails} />
      <Drawer
        anchor="bottom"
        isOpen={isSubnetRiskDrawerOpen}
        containerId={STAKING_MODAL_CONTENT_CONTAINER_ID}
        onDismiss={handleCloseSubnetRiskDrawer}
      >
        <div className="flex w-full flex-col items-center gap-8 rounded-t-xl bg-grey-850 p-12">
          <div className="font-bold text-body">{t("Subnet Alpha Price Risk")}</div>
          <p className="text-center text-body-secondary text-sm">
            {t(
              "When staking to a dTAO subnet, your TAO is converted into the subnet's alpha token. The alpha price will change during the staking period, which can increase or decrease the value of your rewards."
            )}
          </p>
          <div className="flex w-full justify-center text-body-secondary text-sm">
            <Checkbox
              checked={dontRemindAgain}
              onChange={(e) => setDontRemindAgain(e.target.checked)}
              className="justify-center"
              childProps={{ className: "text-center" }}
            >
              {t("Don't remind me again for subnet staking.")}
            </Checkbox>
          </div>
          <Button primary fullWidth onClick={handleCloseSubnetRiskDrawer}>
            {t("Continue")}
          </Button>
        </div>
      </Drawer>
    </>
  )
}
