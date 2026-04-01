import { useTranslation } from "react-i18next"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondFormBase } from "../BittensorBondFormBase"
import { BittensorSelectButton } from "../BittensorSelectButton"

export const BittensorRootBondForm = () => {
  const { t } = useTranslation()
  const { dtaoToken, stakeDirection } = useBittensorBondWizard()

  const RootStakeDetails = () => {
    if (stakeDirection === "unbond") return null

    return (
      <div className="flex items-center justify-between gap-8">
        <div className="whitespace-nowrap">{t("Select Subnet")}</div>
        <div className="truncate text-body">
          <BittensorSelectButton label={dtaoToken?.subnetName || "Root"} nextStep="select-subnet" />
        </div>
      </div>
    )
  }

  return <BittensorBondFormBase BondTypeDetails={RootStakeDetails} />
}
