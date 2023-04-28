import { Navigate, Route, Routes } from "react-router-dom"

import { BalancesPage } from "./balances/BalancesPage"
import { EncryptionPage } from "./encryption/EncryptionPage"
import { IdentityPage } from "./identity/IdentityPage"
import { NavSubstrate } from "./NavSubstrate"
import { SignPage } from "./sign/SignPage"
import { ApiProvider } from "./useApi"
import { NetworkProvider } from "./useNetwork"
import { WalletConfig, WalletProvider } from "./useWallet"

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
            <Route path="*" element={<Navigate to="identity" />} />
          </Routes>
        </WalletProvider>
      </ApiProvider>
    </NetworkProvider>
  )
}
