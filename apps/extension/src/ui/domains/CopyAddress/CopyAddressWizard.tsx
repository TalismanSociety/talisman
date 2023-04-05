import { FC } from "react"

import { CopyAddressTokenForm } from "./CopyAddressTokenForm"
import { CopyAddressWizardInputs } from "./types"
import { CopyAddressWizardProvider, useCopyAddressWizard } from "./useCopyAddressWizard"

const Routes = () => {
  // can't use react-router here because we don't want routing to be based on url
  const { route } = useCopyAddressWizard()
  switch (route) {
    case "token":
      return <CopyAddressTokenForm />
    default:
      return <>Unknown route</>
  }
}

export const CopyAddressWizard: FC<{ inputs: CopyAddressWizardInputs }> = ({ inputs }) => {
  return (
    <CopyAddressWizardProvider initialInputs={inputs}>
      <Routes />
    </CopyAddressWizardProvider>
  )
}
