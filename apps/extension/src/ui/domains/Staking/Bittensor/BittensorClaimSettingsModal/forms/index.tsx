import { useBittensorClaimSettingsWizard } from "../hooks/useBittensorClaimSettingsWizard"
import { BittensorClaimSettingsFollowUp } from "./BittensorClaimSettingsFollowUp"
import { BittensorClaimSettingsForm } from "./BittensorClaimSettingsForm"

export const BittensorClaimSettingsModalRouter = () => {
  const { step } = useBittensorClaimSettingsWizard()

  switch (step) {
    case "claim-settings":
      return <BittensorClaimSettingsForm />
    case "follow-up":
      return <BittensorClaimSettingsFollowUp />
  }
}
