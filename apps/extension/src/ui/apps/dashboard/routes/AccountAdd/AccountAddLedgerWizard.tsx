import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { balancesHydrateState, tokenRatesState } from "@ui/atoms"
import { useRecoilPreload } from "@ui/hooks/useRecoilPreload"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { lazy } from "react"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerDashboardWizard = () => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  useRecoilPreload(balancesHydrateState, tokenRatesState)

  return (
    <DashboardLayout withBack centered>
      <AccountAddLedgerWizard onSuccess={setAddress} />
    </DashboardLayout>
  )
}
