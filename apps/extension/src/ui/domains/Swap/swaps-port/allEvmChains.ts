import type { Chain as ViemChain } from "viem/chains"
import * as allViemEvmChains from "viem/chains"

import { vanaMainnet } from "../swaps-port/vana"

// exclude zoraTestnet which uses Hyperliquid's chain id
const { zoraTestnet, ...validViemChains } = allViemEvmChains

export const allEvmChains: Record<string, ViemChain | undefined> = {
  ...validViemChains,
  vanaMainnet,
}
