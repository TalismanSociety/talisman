import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { Layout } from "@ui/apps/onboard/layout"

export const AccountAddLedgerLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout withBack>
      <OnboardDialog className="w-[68rem]">{children}</OnboardDialog>
    </Layout>
  )
}
