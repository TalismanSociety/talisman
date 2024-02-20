import { AccountAddSecretWizard } from "@ui/domains/Account/AccountAdd/AccountAddMnemonic/router"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddSecretOnboardWizard = () => {
  return (
    <AccountAddWrapper render={(onSuccess) => <AccountAddSecretWizard onSuccess={onSuccess} />} />
  )
}
