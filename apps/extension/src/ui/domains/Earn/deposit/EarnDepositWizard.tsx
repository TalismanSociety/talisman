import { FC } from "react"

import { useEarnDepositWizard } from "./context"
import { EarnDepositStepAccount } from "./steps/EarnDepositStepAccount"
import { EarnDepositStepAmount } from "./steps/EarnDepositStepAmount"

export const EarnDepositWizard: FC = () => {
  const { step, isLoadingProduct } = useEarnDepositWizard()

  if (isLoadingProduct) return null

  switch (step) {
    case "account":
      return <EarnDepositStepAccount />
    default:
      return <EarnDepositStepAmount />
  }
}
