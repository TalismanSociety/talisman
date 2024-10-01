import { AuthorisedSites } from "@ui/domains/Settings/AuthorisedSites/AuthorisedSites"

import { DashboardAdminLayout } from "../../layout/DashboardAdminLayout"

export const ConnectedSitesPage = () => (
  <DashboardAdminLayout centered>
    <AuthorisedSites />
  </DashboardAdminLayout>
)
