import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondDelegateSelect } from "./BittensorBondDelegateSelect"
import { BittensorBondFollowUp } from "./BittensorBondFollowUp"
import { BittensorBondForm } from "./BittensorBondForm"
import { BittensorBondReview } from "./BittensorBondReview"
import { BittensorSubnetBondForm } from "./BittensorSubnetBondForm"

export const BittensorBondModalBody = () => {
  const { step } = useBittensorBondWizard()

  switch (step) {
    case "select":
      return <BittensorBondDelegateSelect />
    case "form":
      return <BittensorBondForm />
    case "root-form":
      return <BittensorSubnetBondForm />
    case "review":
      return <BittensorBondReview />
    case "follow-up":
      return <BittensorBondFollowUp />
  }
}
