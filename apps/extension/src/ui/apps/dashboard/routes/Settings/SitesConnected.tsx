import Layout from "@ui/apps/dashboard/layout"
import Settings from "@ui/domains/Settings"

const AccountIndex = () => (
  <Layout centered withBack backTo="/settings">
    <Settings.AuthorisedSites />
  </Layout>
)

export default AccountIndex
