import { FC } from "react"

import { YieldxyzExitStepAmount } from "./steps/YieldxyzExitStepAmount"
import { YieldxyzExitStepConfirm } from "./steps/YieldxyzExitStepConfirm"
import { useYieldxyzExitWizard } from "./useYieldxyzExitWizard"

export const YieldxyzExitPositionWizard: FC = () => {
  const { step } = useYieldxyzExitWizard()

  switch (step) {
    case "confirm":
      return <YieldxyzExitStepConfirm />
    default:
      return <YieldxyzExitStepAmount />
  }
}
