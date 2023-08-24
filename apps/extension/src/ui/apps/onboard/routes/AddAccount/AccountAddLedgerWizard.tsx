import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { Layout } from "@ui/apps/onboard/layout"
import { lazy } from "react"

const AccountAddLedgerWizard = lazy(() => import("@ui/domains/Account/AccountAdd/AccountAddLedger"))

export const AccountAddLedgerOnboardWizard = () => {
  const { setOnboarded } = useOnboard()
  return (
    <Layout withBack>
      <OnboardDialog className="w-[68rem]">
        <AccountAddLedgerWizard onSuccess={setOnboarded} />
      </OnboardDialog>
    </Layout>
  )
}
