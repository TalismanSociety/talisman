import Layout from "@ui/apps/dashboard/layout"

import { ConfigureAccount } from "./ConfigureAccount"
import { AccountAddQrProvider, useAccountAddQr } from "./context"
import { Scan } from "./Scan"

const WrappedAccountAddQr = () => {
  const { state } = useAccountAddQr()

  return (
    <Layout withBack centered>
      {state.type === "SCAN" && <Scan />}
      {state.type === "CONFIGURE" && <ConfigureAccount />}
      {state.type === "CONFIGURE_COMPANION" && <>Placeholder</>}
    </Layout>
  )
}

export const AccountAddQr = () => {
  return (
    <AccountAddQrProvider>
      <WrappedAccountAddQr />
    </AccountAddQrProvider>
  )
}
