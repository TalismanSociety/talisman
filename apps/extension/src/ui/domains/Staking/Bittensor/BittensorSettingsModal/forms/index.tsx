import { useBittensorSettingsWizard } from "../hooks/useBittensorSettingsWizard"
import { BittensorClaimSubnetSelect } from "./BittensorClaimSubnetSelect"
import { BittensorSettingsFollowUp } from "./BittensorSettingsFollowUp"
import { BittensorSettingsForm } from "./BittensorSettingsForm"

export const BittensorSettingsModalRouter = () => {
  const { step } = useBittensorSettingsWizard()

  switch (step) {
    case "settings":
      return <BittensorSettingsForm />
    case "select-subnets":
      return <BittensorClaimSubnetSelect />
    case "follow-up":
      return <BittensorSettingsFollowUp />
  }
}
