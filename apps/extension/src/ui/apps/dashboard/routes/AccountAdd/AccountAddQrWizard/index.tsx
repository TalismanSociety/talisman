import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"

import { ConfigureAccount } from "./ConfigureAccount"
import { ConfigureVerifierCertificateMnemonic } from "./ConfigureVerifierCertificateMnemonic"
import { AccountAddQrProvider, useAccountAddQr } from "./context"
import { Scan } from "./Scan"

const WrappedAccountAddQr = () => {
  const { state } = useAccountAddQr()

  return (
    <DashboardLayout withBack centered>
      {state.type === "SCAN" && <Scan />}
      {state.type === "CONFIGURE" && <ConfigureAccount />}
      {state.type === "CONFIGURE_VERIFIER_CERT" && <ConfigureVerifierCertificateMnemonic />}
    </DashboardLayout>
  )
}

export const AccountAddQrWizard = () => {
  return (
    <AccountAddQrProvider>
      <WrappedAccountAddQr />
    </AccountAddQrProvider>
  )
}
