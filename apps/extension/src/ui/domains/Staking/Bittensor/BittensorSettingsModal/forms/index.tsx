import { useBittensorSettingsWizard } from "../hooks/useBittensorSettingsWizard"
import { BittensorSettingsFollowUp } from "./BittensorSettingsFollowUp"
import { BittensorSettingsForm } from "./BittensorSettingsForm"

export const BittensorSettingsModalRouter = () => {
  const { step } = useBittensorSettingsWizard()

  switch (step) {
    case "settings":
      return <BittensorSettingsForm />
    case "follow-up":
      return <BittensorSettingsFollowUp />
  }
}
