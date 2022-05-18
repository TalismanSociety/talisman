import Account from "@ui/domains/Account"
import Layout from "../layout"

const AccountIndex = () => (
  <Layout>
    <Account.List
      withAvatar
      withCopy
      withSource
      withBackupIndicator
      withBalanceInline
      withSend
      withFiat
    />
  </Layout>
)

export default AccountIndex
