import { FC } from "react"

import { YieldxyzClaimStepAmount } from "./steps/YieldxyzClaimStepAmount"
import { YieldxyzClaimStepConfirm } from "./steps/YieldxyzClaimStepConfirm"
import { useYieldxyzClaimWizard } from "./useYieldxyzClaimWizard"

export const YieldxyzClaimPositionWizard: FC = () => {
  const { step } = useYieldxyzClaimWizard()

  switch (step) {
    case "amount":
      return <YieldxyzClaimStepAmount />
    case "confirm":
      return <YieldxyzClaimStepConfirm />
  }
}
