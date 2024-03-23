import { createConfig, http } from "wagmi"

import { talismanChains } from "./talismanChains"

const chains = talismanChains
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transports = Object.fromEntries(chains.map((chain) => [chain.id, http()])) as any

export const wagmiConfig = createConfig({
  chains,
  transports,
})
