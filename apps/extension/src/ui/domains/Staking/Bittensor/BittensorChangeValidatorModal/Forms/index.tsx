import { useBittensorChangeValidatorWizard } from "../../hooks/useBittensorChangeValidatorWizard"
import { ChangeValidatorFollowUp } from "./ChangeValidatorFollowUp"
import { ChangeValidatorForm } from "./ChangeValidatorForm"
import { ChangeValidatorPositionSelect } from "./ChangeValidatorPositionSelect"
import { ChangeValidatorReview } from "./ChangeValidatorReview"
import { ChangeValidatorSelect } from "./ChangeValidatorSelect"

export const ChangeValidatorModalRouter = () => {
  const { step } = useBittensorChangeValidatorWizard()

  switch (step) {
    case "form":
      return <ChangeValidatorForm />
    case "select-position":
      return <ChangeValidatorPositionSelect />
    case "select-validator":
      return <ChangeValidatorSelect />
    case "review":
      return <ChangeValidatorReview />
    case "follow-up":
      return <ChangeValidatorFollowUp />
  }
}
