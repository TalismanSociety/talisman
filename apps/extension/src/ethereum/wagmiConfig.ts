import { createConfig, http } from "wagmi"
import { mainnet, polygon } from "wagmi/chains"

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
  },
})
