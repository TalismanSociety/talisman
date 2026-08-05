import { BittensorClaimPositionPicker } from "../components/BittensorClaimPositionPicker"
import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"
import { BittensorClaimFollowUp } from "./BittensorClaimFollowUp"
import { BittensorClaimForm } from "./BittensorClaimForm"

export const BittensorClaimModalRouter = () => {
  const { hash, target } = useBittensorClaimWizard()

  if (hash) return <BittensorClaimFollowUp />
  if (!target) return <BittensorClaimPositionPicker />
  return <BittensorClaimForm />
}
