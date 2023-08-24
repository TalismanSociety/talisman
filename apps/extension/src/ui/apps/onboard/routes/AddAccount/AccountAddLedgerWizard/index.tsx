import { useOnboard } from "@ui/apps/onboard/context"
import { lazy } from "react"

import { AccountAddLedgerLayout } from "./AccountAddLedgerLayout"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerOnboardWizard = () => {
  const { setOnboarded } = useOnboard()
  return (
    <AccountAddLedgerLayout>
      <AccountAddLedgerWizard onSuccess={setOnboarded} />
    </AccountAddLedgerLayout>
  )
}
