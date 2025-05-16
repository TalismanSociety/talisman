import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondDelegateSelect } from "./BittensorBondDelegateSelect"
import { BittensorBondFollowUp } from "./BittensorBondFollowUp"
import { BittensorBondReview } from "./BittensorBondReview"
import { BittensorRootBondForm } from "./BittensorRootBondForm"
import { BittensorSubnetBondForm } from "./BittensorSubnetBondForm"
import { BittensorSubnetBondReview } from "./BittensorSubnetBondReview"
import { BittensorSubnetSelect } from "./BittensorSubnetSelect"

export const BittensorBondModalBody = () => {
  const { step } = useBittensorBondWizard()

  switch (step) {
    case "form":
      return <BittensorRootBondForm />
    case "subnet-form":
      return <BittensorSubnetBondForm />
    case "select":
      return <BittensorBondDelegateSelect />
    case "select-subnet":
      return <BittensorSubnetSelect />
    case "review":
      return <BittensorBondReview />
    case "subnet-review":
      return <BittensorSubnetBondReview />
    case "follow-up":
      return <BittensorBondFollowUp />
  }
}
