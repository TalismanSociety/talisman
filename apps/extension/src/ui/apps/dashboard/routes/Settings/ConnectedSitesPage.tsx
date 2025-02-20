import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { AuthorisedSites } from "@ui/domains/Settings/AuthorisedSites/AuthorisedSites"

export const ConnectedSitesPage = () => (
  <DashboardLayout sidebar="settings">
    <AuthorisedSites />
  </DashboardLayout>
)
