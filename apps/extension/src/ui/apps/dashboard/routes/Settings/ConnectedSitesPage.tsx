import { AuthorisedSites } from "@ui/domains/Settings/AuthorisedSites/AuthorisedSites"

import { DashboardLayout } from "../../layout"

export const ConnectedSitesPage = () => (
  <DashboardLayout sidebar="settings">
    <AuthorisedSites />
  </DashboardLayout>
)
