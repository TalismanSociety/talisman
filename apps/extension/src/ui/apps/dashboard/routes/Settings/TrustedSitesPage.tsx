import { AuthorisedSites } from "@ui/domains/Settings/AuthorisedSites/AuthorisedSites"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const TrustedSitesPage = () => (
  <DashboardLayout centered withBack backTo="/settings">
    <AuthorisedSites />
  </DashboardLayout>
)
