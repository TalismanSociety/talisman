import { FC } from "react"

import { YieldxyzManageStepConfirm } from "./steps/YieldxyzManageStepConfirm"

export const YieldxyzManagePositionWizard: FC = () => {
  // for now the wizard only has one step: confirm

  return <YieldxyzManageStepConfirm />
}
