import { useTranslation } from "react-i18next"

import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondFormBase } from "../BittensorBondFormBase"
import { BittensorSelectButton } from "../BittensorSelectButton"

export const BittensorSubnetBondForm = () => {
  const { t } = useTranslation()

  const { netuid } = useBittensorBondWizard()
  const { isLoading, subnetData } = useCombinedSubnetData()

  const { subnet_name, symbol } = subnetData?.[netuid || 0] ?? {}

  const selectedSubnetLabel = `SN${netuid} ${subnet_name} ${symbol}`
  const label = netuid ? selectedSubnetLabel : "Subnet"

  const SubnetStakeDetails = () => {
    return (
      <div className="flex items-center justify-between gap-8">
        <div className="whitespace-nowrap">{t("Select Subnet")}</div>
        <div className="text-body truncate">
          <BittensorSelectButton label={label} isLoading={isLoading} nextStep="select-subnet" />
        </div>
      </div>
    )
  }
  return <BittensorBondFormBase BondTypeDetails={SubnetStakeDetails} />
}
