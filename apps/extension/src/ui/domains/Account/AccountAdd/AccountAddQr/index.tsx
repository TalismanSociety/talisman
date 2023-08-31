import { AccountAddPageProps } from "../types"
import { ConfigureAccount } from "./ConfigureAccount"
import { ConfigureVerifierCertificateMnemonic } from "./ConfigureVerifierCertificateMnemonic"
import { AccountAddQrProvider, useAccountAddQr } from "./context"
import { Scan } from "./Scan"

const AccountAddQrRouter = () => {
  const { state } = useAccountAddQr()

  return (
    <>
      {state.type === "SCAN" && <Scan />}
      {state.type === "CONFIGURE" && <ConfigureAccount />}
      {state.type === "CONFIGURE_VERIFIER_CERT" && <ConfigureVerifierCertificateMnemonic />}
    </>
  )
}

export const AccountAddQrWizard = ({ onSuccess }: AccountAddPageProps) => (
  <AccountAddQrProvider onSuccess={onSuccess}>
    <AccountAddQrRouter />
  </AccountAddQrProvider>
)
