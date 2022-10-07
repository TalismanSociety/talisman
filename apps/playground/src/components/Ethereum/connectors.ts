import { WagmiConfig, createClient, allChains, configureChains, Chain } from "wagmi"

import { alchemyProvider } from "wagmi/providers/alchemy"
import { publicProvider } from "wagmi/providers/public"

import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet"
import { InjectedConnector } from "wagmi/connectors/injected"
import { MetaMaskConnector } from "wagmi/connectors/metaMask"
import { WalletConnectConnector } from "wagmi/connectors/walletConnect"
import { TalismanConnector } from "@talismn/wagmi-connector"
import { talismanChains } from "./talismanChains"

const chainsMap: Record<number, Chain> = allChains.reduce(
  (prev, curr) => ({
    ...prev,
    [curr.id]: curr,
  }),
  {}
)
for (const chain of talismanChains) chainsMap[chain.id] = chain

// Configure chains & providers with the Alchemy provider.
// Two popular providers are Alchemy (alchemy.com) and Infura (infura.io)
const { chains, provider, webSocketProvider } = configureChains(Object.values(chainsMap), [
  // alchemyProvider({ apiKey: "yourAlchemyApiKey" }),
  publicProvider(),
])

// Set up client
export const wagmiClient = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    // new CoinbaseWalletConnector({
    //   chains,
    //   options: {
    //     appName: "wagmi",
    //   },
    // }),
    // new WalletConnectConnector({
    //   chains,
    //   options: {
    //     qrcode: true,
    //   },
    // }),
    new TalismanConnector({ chains }),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  provider,
  webSocketProvider,
})
