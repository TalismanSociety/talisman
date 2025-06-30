import type { Chain as ViemChain } from "viem/chains"
import * as allViemEvmChains from "viem/chains"

import { vanaMainnet } from "../swaps-port/vana"

export const allEvmChains: Record<string, ViemChain | undefined> = {
  ...allViemEvmChains,
  vanaMainnet,
}
