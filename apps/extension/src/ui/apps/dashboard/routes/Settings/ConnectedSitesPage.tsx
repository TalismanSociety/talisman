import { AuthorisedSites } from "@ui/domains/Settings/AuthorisedSites/AuthorisedSites"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const ConnectedSitesPage = () => (
  <DashboardLayout centered>
    <AuthorisedSites />
  </DashboardLayout>
)
