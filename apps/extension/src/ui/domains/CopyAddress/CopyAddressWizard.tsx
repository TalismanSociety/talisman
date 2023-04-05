import { FC } from "react"

import { CopyAddressAccountForm } from "./CopyAddressAccountForm"
import { CopyAddressTokenForm } from "./CopyAddressTokenForm"
import { CopyAddressWizardInputs } from "./types"
import { CopyAddressWizardProvider, useCopyAddressWizard } from "./useCopyAddressWizard"

const Routes = () => {
  // can't use react-router here because we don't want routing to be based on url
  const { route, state } = useCopyAddressWizard()

  switch (route) {
    case "token":
      return <CopyAddressTokenForm />
    case "account":
      return <CopyAddressAccountForm />
    default:
      return <>Unknown route</>
  }
}

export const CopyAddressWizard: FC<{ inputs: CopyAddressWizardInputs }> = ({ inputs }) => {
  return (
    <CopyAddressWizardProvider inputs={inputs}>
      <Routes />
    </CopyAddressWizardProvider>
  )
}
