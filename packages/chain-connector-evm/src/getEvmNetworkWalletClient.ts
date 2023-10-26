import { EvmNetwork, Token } from "@talismn/chaindata-provider"
import { Account, WalletClient, createWalletClient, http } from "viem"

import { getChainFromEvmNetwork } from "./getChainFromEvmNetwork"

type WalletClientOptions = {
  account?: `0x${string}` | Account
  onFinalityApiKey?: string
}

export const getEvmNetworkWalletClient = (
  evmNetwork: EvmNetwork,
  nativeToken: Token,
  options: WalletClientOptions = {}
): WalletClient => {
  const chain = getChainFromEvmNetwork(evmNetwork, nativeToken, {
    onFinalityApiKey: options.onFinalityApiKey,
  })

  return createWalletClient({ chain, transport: http(), account: options.account })
}
