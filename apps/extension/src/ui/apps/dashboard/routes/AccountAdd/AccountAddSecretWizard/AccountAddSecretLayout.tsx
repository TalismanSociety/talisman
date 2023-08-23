import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"

export const AccountAddSecretLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DashboardLayout withBack centered>
      {children}
    </DashboardLayout>
  )
}
