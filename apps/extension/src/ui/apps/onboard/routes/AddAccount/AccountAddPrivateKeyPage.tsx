import { AccountAddPrivateKeyForm } from "@ui/domains/Account/AccountAdd/AccountAddPrivateKeyForm"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddPrivateKeyOnboardWizard = () => {
  return (
    <AccountAddWrapper
      className="min-h-[44rem] min-w-[68rem]"
      render={(onSuccess) => <AccountAddPrivateKeyForm onSuccess={onSuccess} />}
    />
  )
}
