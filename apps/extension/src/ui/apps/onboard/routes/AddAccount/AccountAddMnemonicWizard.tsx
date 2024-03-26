import { AccountAddMnemonicWizard } from "@ui/domains/Account/AccountAdd/AccountAddMnemonic/router"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddMnemonicOnboardWizard = () => {
  return (
    <AccountAddWrapper
      className="min-h-[88rem] min-w-[68rem]"
      render={(onSuccess) => <AccountAddMnemonicWizard onSuccess={onSuccess} />}
    />
  )
}
