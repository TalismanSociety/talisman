import { lazy } from "react"

import { AccountAddWrapper } from "./AccountAddWrapper"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerOnboardWizard = () => (
  <AccountAddWrapper render={(onSuccess) => <AccountAddLedgerWizard onSuccess={onSuccess} />} />
)
