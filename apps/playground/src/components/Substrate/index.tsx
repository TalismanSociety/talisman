import { TestLayout } from "../TestLayout"
import { Account } from "./Account"
import { Balance } from "./Balance"
import { Identity } from "./Identity"
import { Network } from "./Network"
import { SignMessage } from "./SignMessage"
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
          <TestLayout title="Substrate">
            <Network />
            <Account />
            <Balance />
            <SignMessage />
            <Identity />
          </TestLayout>
        </WalletProvider>
      </ApiProvider>
    </NetworkProvider>
  )
}
