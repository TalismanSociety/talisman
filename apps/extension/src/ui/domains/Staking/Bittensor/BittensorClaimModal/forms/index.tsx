import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"
import { BittensorClaimFollowUp } from "./BittensorClaimFollowUp"
import { BittensorClaimForm } from "./BittensorClaimForm"

export const BittensorClaimModalRouter = () => {
  const { step } = useBittensorClaimWizard()

  switch (step) {
    case "review":
      return <BittensorClaimForm />
    case "follow-up":
      return <BittensorClaimFollowUp />
  }
}
