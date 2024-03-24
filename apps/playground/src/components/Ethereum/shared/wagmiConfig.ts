import { createConfig, http } from "wagmi"

import { talismanChains } from "./talismanChains"

const chains = talismanChains
const transports = Object.fromEntries(
  chains.map((chain) => [chain.id, http()])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) as any

export const wagmiConfig = createConfig({
  chains,
  transports,
})
