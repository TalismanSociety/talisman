import { FC } from "react"

import { CopyAddressAccountForm } from "./CopyAddressAccountForm"
import { CopyAddressChainForm } from "./CopyAddressChainForm"
import { CopyAddressCopyForm } from "./CopyAddressCopyForm"
import { CopyAddressTokenForm } from "./CopyAddressTokenForm"
import { CopyAddressWizardInputs } from "./types"
import { CopyAddressWizardProvider, useCopyAddressWizard } from "./useCopyAddressWizard"

const Routes = () => {
  // can't use react-router here because we don't want routing to be based on url
  const { state } = useCopyAddressWizard()

  switch (state.route) {
    case "token":
      return <CopyAddressTokenForm />
    case "chain":
      return <CopyAddressChainForm />
    case "account":
      return <CopyAddressAccountForm />
    case "copy":
      return <CopyAddressCopyForm />
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
