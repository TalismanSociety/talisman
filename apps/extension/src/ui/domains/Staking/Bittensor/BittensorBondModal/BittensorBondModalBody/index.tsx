import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondDelegateSelect } from "./BittensorBondDelegateSelect"
import { BittensorBondFollowUp } from "./BittensorBondFollowUp"
import { BittensorBondReview } from "./BittensorBondReview"
import { BittensorRootBondForm } from "./BittensorRootBondForm"
import { BittensorSubnetBondForm } from "./BittensorSubnetBondForm"

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
      return <div>Select subnet</div>
    case "review":
      return <BittensorBondReview />
    case "follow-up":
      return <BittensorBondFollowUp />
  }
}
