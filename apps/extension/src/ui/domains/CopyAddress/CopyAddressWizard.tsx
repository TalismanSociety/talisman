import { FC } from "react"

import { CopyAddressAccountForm } from "./CopyAddressAccountForm"
import { CopyAddressChainForm } from "./CopyAddressChainForm"
import { CopyAddressCopyForm } from "./CopyAddressCopyForm"
import { CopyAddressWizardInputs } from "./types"
import { CopyAddressWizardProvider, useCopyAddressWizard } from "./useCopyAddressWizard"

const Routes = () => {
  // can't use react-router here because we don't want routing to be based on url
  const { route } = useCopyAddressWizard()

  switch (route) {
    case "chain":
      return <CopyAddressChainForm />
    case "account":
      return <CopyAddressAccountForm />
    case "copy":
      return <CopyAddressCopyForm />
  }
}

export const CopyAddressWizard: FC<{ inputs: CopyAddressWizardInputs }> = ({ inputs }) => {
  return (
    <CopyAddressWizardProvider inputs={inputs}>
      <Routes />
    </CopyAddressWizardProvider>
  )
}
