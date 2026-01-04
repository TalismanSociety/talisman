import { useBittensorClaimSettingsWizard } from "../hooks/useBittensorClaimSettingsWizard"
import { BittensorClaimSettingsFollowUp } from "./BittensorClaimSettingsFollowUp"
import { BittensorClaimSettingsForm } from "./BittensorClaimSettingsForm"
import { BittensorClaimSubnetSelect } from "./BittensorClaimSubnetSelect"

export const BittensorClaimSettingsModalRouter = () => {
  const { step } = useBittensorClaimSettingsWizard()

  switch (step) {
    case "claim-settings":
      return <BittensorClaimSettingsForm />
    case "select-subnets":
      return <BittensorClaimSubnetSelect />
    case "follow-up":
      return <BittensorClaimSettingsFollowUp />
  }
}
