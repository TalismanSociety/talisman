import { BittensorBondDelegateSelect } from "../../BittensorBondDelegateSelect"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondFollowUp } from "./BittensorBondFollowUp"
import { BittensorBondForm } from "./BittensorBondForm"
import { BittensorBondReview } from "./BittensorBondReview"

export const BittensorBondModalBody = () => {
  const { step } = useBittensorBondWizard()

  switch (step) {
    case "select":
      return <BittensorBondDelegateSelect />
    case "form":
      return <BittensorBondForm />
    case "review":
      return <BittensorBondReview />
    case "follow-up":
      return <BittensorBondFollowUp />
  }
}
