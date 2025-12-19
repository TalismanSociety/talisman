import { FC } from "react"

import { YieldxyzEnterStepAccount } from "./steps/YieldxyzEnterStepAccount"
import { YieldxyzEnterStepAmount } from "./steps/YieldxyzEnterStepAmount"
import { YieldxyzEnterStepConfirm } from "./steps/YieldxyzEnterStepConfirm"
import { useYieldxyzEnterWizard } from "./useYieldxyzEnterWizard"

export const YieldXyzEnterPositionWizard: FC = () => {
  const { step, isLoadingProduct } = useYieldxyzEnterWizard()

  if (isLoadingProduct) return null

  switch (step) {
    case "account":
      return <YieldxyzEnterStepAccount />
    case "confirm":
      return <YieldxyzEnterStepConfirm />
    default:
      return <YieldxyzEnterStepAmount />
  }
}
