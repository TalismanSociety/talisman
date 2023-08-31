import { AccountAddDerivedForm } from "@ui/domains/Account/AccountAdd/AccountAddDerivedForm"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddDerivedPage = () => (
  <AccountAddWrapper
    title="Create a new account"
    render={(onSuccess) => <AccountAddDerivedForm onSuccess={onSuccess} />}
  />
)
