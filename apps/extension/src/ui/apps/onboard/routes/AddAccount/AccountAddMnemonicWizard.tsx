import { lazy } from "react"

import { AccountAddWrapper } from "./AccountAddWrapper"

const AccountAddMnemonicWizard = lazy(
  () => import("@ui/domains/Account/AccountAdd/AccountAddMnemonic/router")
)

export const AccountAddMnemonicOnboardWizard = () => {
  return (
    <AccountAddWrapper
      className="min-h-[88rem] min-w-[68rem]"
      render={(onSuccess) => <AccountAddMnemonicWizard onSuccess={onSuccess} />}
    />
  )
}
