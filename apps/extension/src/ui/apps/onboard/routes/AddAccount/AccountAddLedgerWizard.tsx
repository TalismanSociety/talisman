import { lazy } from "react"

import { AccountAddWrapper } from "./AccountAddWrapper"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerOnboardWizard = () => (
  <AccountAddWrapper
    className="min-h-[90rem] min-w-[68rem]"
    render={(onSuccess) => <AccountAddLedgerWizard onSuccess={onSuccess} />}
  />
)
