import { useTranslation } from "react-i18next"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondFormBase } from "../BittensorBondFormBase"
import { BittensorSelectButton } from "../BittensorSelectButton"

export const BittensorSubnetBondForm = () => {
  const { t } = useTranslation()

  const { dtaoToken } = useBittensorBondWizard()

  const SubnetStakeDetails = () => {
    return (
      <div className="flex items-center justify-between gap-8">
        <div className="whitespace-nowrap">{t("Select Subnet")}</div>
        <div className="text-body truncate">
          <BittensorSelectButton
            label={
              dtaoToken?.netuid
                ? (dtaoToken.subnetName ?? t(`Subnet {{netuid}}`, dtaoToken))
                : t("Subnet")
            }
            nextStep="select-subnet"
          />
        </div>
      </div>
    )
  }
  return <BittensorBondFormBase BondTypeDetails={SubnetStakeDetails} />
}
