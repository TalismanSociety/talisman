import Settings from "@ui/domains/Settings"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const TrustedSitesPage = () => (
  <DashboardLayout centered withBack backTo="/settings">
    <Settings.AuthorisedSites />
  </DashboardLayout>
)
