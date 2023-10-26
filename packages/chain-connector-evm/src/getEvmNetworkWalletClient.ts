import { EvmNetwork, Token } from "@talismn/chaindata-provider"
import { Account, WalletClient, createWalletClient, http } from "viem"

import { getChainFromEvmNetwork } from "./getChainFromEvmNetwork"

export const getEvmNetworkWalletClient = (
  evmNetwork: EvmNetwork,
  nativeToken: Token,
  account?: `0x${string}` | Account
): WalletClient => {
  const chain = getChainFromEvmNetwork(evmNetwork, nativeToken)

  return createWalletClient({ chain, transport: http(), account })
}
