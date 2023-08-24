import { AccountAddJson } from "@ui/domains/Account/AccountAdd/AccountAddJson"

import { AccountAddWrapper } from "./AccountAddWrapper"

export const AccountAddJsonPage = () => (
  <AccountAddWrapper
    title="Import JSON"
    subtitle="Please choose the .json file you exported from Polkadot.js or Talisman"
    render={(onSuccess) => <AccountAddJson onSuccess={onSuccess} />}
  />
)
