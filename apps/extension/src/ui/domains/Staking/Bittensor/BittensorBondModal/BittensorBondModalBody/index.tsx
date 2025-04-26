import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondDelegateSelect } from "./BittensorBondDelegateSelect"
import { BittensorBondFollowUp } from "./BittensorBondFollowUp"
import { BittensorBondReview } from "./BittensorBondReview"
import { BittensorRootBondForm } from "./BittensorRootBondForm"
import { BittensorSubnetBondForm } from "./BittensorSubnetBondForm"

export const BittensorBondModalBody = () => {
  const { step } = useBittensorBondWizard()

  switch (step) {
    case "select":
      return <BittensorBondDelegateSelect />
    case "form":
      return <BittensorRootBondForm />
    case "root-form":
      return <BittensorSubnetBondForm />
    case "review":
      return <BittensorBondReview />
    case "follow-up":
      return <BittensorBondFollowUp />
  }
}
