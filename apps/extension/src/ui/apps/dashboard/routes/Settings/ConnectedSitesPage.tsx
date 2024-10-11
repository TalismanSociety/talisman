import { AuthorisedSites } from "@ui/domains/Settings/AuthorisedSites/AuthorisedSites"

import { DashboardMainLayout } from "../../layout"

export const ConnectedSitesPage = () => (
  <DashboardMainLayout sidebar="settings" width="660">
    <AuthorisedSites />
  </DashboardMainLayout>
)
