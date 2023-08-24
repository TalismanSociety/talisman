import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { lazy } from "react"

import { AccountAddLedgerLayout } from "./AccountAddLedgerLayout"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  return (
    <AccountAddLedgerLayout>
      <AccountAddLedgerWizard onSuccess={setAddress} />
    </AccountAddLedgerLayout>
  )
}
