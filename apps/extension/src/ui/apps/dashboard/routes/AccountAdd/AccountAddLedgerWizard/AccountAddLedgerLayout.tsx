import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"

export const AccountAddLedgerLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DashboardLayout withBack centered>
      {children}
    </DashboardLayout>
  )
}
