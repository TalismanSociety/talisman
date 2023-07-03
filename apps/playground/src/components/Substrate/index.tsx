import { Navigate, Route, Routes } from "react-router-dom"

import { BalancesPage } from "./balances/BalancesPage"
import { EncryptionPage } from "./encryption/EncryptionPage"
import { IdentityPage } from "./identity/IdentityPage"
import { MiscPage } from "./misc/MiscPage"
import { NavSubstrate } from "./NavSubstrate"
import { ApiProvider } from "./shared/useApi"
import { NetworkProvider } from "./shared/useNetwork"
import { WalletConfig, WalletProvider } from "./shared/useWallet"
import { SignPage } from "./sign/SignPage"

const config: WalletConfig = {
  appName: "Talisman Playground",
  accountOptions: {
    accountType: ["sr25519"],
  },
}

export const Substrate = () => {
  return (
    <NetworkProvider>
      <ApiProvider>
        <WalletProvider {...config}>
          <NavSubstrate />
          <Routes>
            <Route path="balances" element={<BalancesPage />} />
            <Route path="identity" element={<IdentityPage />} />
            <Route path="sign" element={<SignPage />} />
            <Route path="encryption" element={<EncryptionPage />} />
            <Route path="Misc" element={<MiscPage />} />
            <Route path="*" element={<Navigate to="identity" />} />
          </Routes>
        </WalletProvider>
      </ApiProvider>
    </NetworkProvider>
  )
}
