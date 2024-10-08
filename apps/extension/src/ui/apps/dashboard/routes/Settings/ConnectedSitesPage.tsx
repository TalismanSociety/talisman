import { AuthorisedSites } from "@ui/domains/Settings/AuthorisedSites/AuthorisedSites"

import { DashboardAdminLayout } from "../../layout"

export const ConnectedSitesPage = () => (
  <DashboardAdminLayout centered>
    <AuthorisedSites />
  </DashboardAdminLayout>
)
