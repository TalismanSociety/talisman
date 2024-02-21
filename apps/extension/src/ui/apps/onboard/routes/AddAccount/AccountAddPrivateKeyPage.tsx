import { AccountAddMnemonicWizard } from "@ui/domains/Account/AccountAdd/AccountAddMnemonic/router"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddPrivateKeyOnboardWizard = () => {
  return (
    <AccountAddWrapper render={(onSuccess) => <AccountAddMnemonicWizard onSuccess={onSuccess} />} />
  )
}
