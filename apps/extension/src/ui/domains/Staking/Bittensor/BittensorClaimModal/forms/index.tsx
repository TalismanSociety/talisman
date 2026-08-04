import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"
import { BittensorClaimFollowUp } from "./BittensorClaimFollowUp"
import { BittensorClaimForm } from "./BittensorClaimForm"

export const BittensorClaimModalRouter = () => {
  const { hash } = useBittensorClaimWizard()

  return hash ? <BittensorClaimFollowUp /> : <BittensorClaimForm />
}
