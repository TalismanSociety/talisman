import { FC } from "react"

import { YieldxyzEnterStepAccount } from "./steps/YieldxyzEnterStepAccount"
import { YieldxyzEnterStepAmount } from "./steps/YieldxyzEnterStepAmount"
import { YieldxyzEnterStepConfirm } from "./steps/YieldxyzEnterStepConfirm"
import { YieldxyzEnterStepProduct } from "./steps/YieldxyzEnterStepProduct"
import { YieldxyzEnterStepToken } from "./steps/YieldxyzEnterStepToken"
import { useYieldxyzEnterWizard } from "./useYieldxyzEnterWizard"

export const YieldxyzEnterPositionWizard: FC = () => {
  const { step, isLoadingProduct } = useYieldxyzEnterWizard()

  if (isLoadingProduct) return null

  switch (step) {
    case "token":
      return <YieldxyzEnterStepToken />
    case "product":
      return <YieldxyzEnterStepProduct />
    case "account":
      return <YieldxyzEnterStepAccount />
    case "amount":
      return <YieldxyzEnterStepAmount />
    case "confirm":
      return <YieldxyzEnterStepConfirm />
  }
}
