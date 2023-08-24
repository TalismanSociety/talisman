import { AccountAddWatchedForm } from "@ui/domains/Account/AccountAdd/AccountAddWatchedForm"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddWatchedPage = () => (
  <AccountAddWrapper
    title="Choose account type"
    subtitle="What type of account would you like to add?"
    render={(onSuccess) => <AccountAddWatchedForm onSuccess={onSuccess} />}
  />
)
