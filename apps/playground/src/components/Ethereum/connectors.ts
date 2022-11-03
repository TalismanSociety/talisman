import { TalismanConnector } from "@talismn/wagmi-connector"
import { Chain, allChains, configureChains, createClient } from "wagmi"
import { InjectedConnector } from "wagmi/connectors/injected"
import { MetaMaskConnector } from "wagmi/connectors/metaMask"
import { publicProvider } from "wagmi/providers/public"

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
  publicProvider(),
])

// Set up client
export const wagmiClient = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
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
