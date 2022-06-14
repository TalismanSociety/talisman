import Settings from "@ui/domains/Settings"
import Layout from "@ui/apps/dashboard/layout"

const AccountIndex = () => (
  <Layout centered withBack>
    <Settings.AuthorisedSites />
  </Layout>
)

export default AccountIndex
