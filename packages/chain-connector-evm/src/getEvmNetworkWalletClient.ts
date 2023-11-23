import { EvmNetwork, Token } from "@talismn/chaindata-provider"
import { Account, WalletClient, createWalletClient } from "viem"

import { getChainFromEvmNetwork } from "./getChainFromEvmNetwork"
import { getTransportForEvmNetwork } from "./getTransportForEvmNetwork"

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

  const transport = getTransportForEvmNetwork(evmNetwork, options)

  return createWalletClient({ chain, transport, account: options.account })
}
