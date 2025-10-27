import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondDelegateSelect } from "./BittensorBondDelegateSelect"
import { BittensorBondFollowUp } from "./BittensorBondFollowUp"
import { BittensorBondReview } from "./BittensorBondReview"
import { BittensorRootBondForm } from "./BittensorRootBondForm"
import { BittensorSubnetBondForm } from "./BittensorSubnetBondForm"
import { BittensorSubnetBondReview } from "./BittensorSubnetBondReview"
import { BittensorSubnetSelect } from "./BittensorSubnetSelect"

export const BittensorBondModalBody = () => {
  const { step, stakeType } = useBittensorBondWizard()

  switch (step) {
    case "form":
      return stakeType === "subnet" ? <BittensorSubnetBondForm /> : <BittensorRootBondForm />
    case "select-delegate":
      return <BittensorBondDelegateSelect />
    case "select-subnet":
      return <BittensorSubnetSelect />
    case "review":
      return stakeType === "subnet" ? <BittensorSubnetBondReview /> : <BittensorBondReview />
    case "follow-up":
      return <BittensorBondFollowUp />
  }
}
