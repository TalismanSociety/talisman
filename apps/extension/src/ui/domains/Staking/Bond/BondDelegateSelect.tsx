import { Button } from "talisman-ui"

import { useBondWizard } from "./useBondWizard"

export const BondDelegateSelect = () => {
  const { setStep } = useBondWizard()
  return (
    <div>
      <div>Content</div>
      <Button onClick={() => setStep("form")}>Continue T</Button>
    </div>
  )
}
