import { EthNetwork, Token } from "@talismn/chaindata-provider"
import { Account, createWalletClient, WalletClient } from "viem"

import { getChainFromEvmNetwork } from "./getChainFromEvmNetwork"
import { getTransportForEvmNetwork } from "./getTransportForEvmNetwork"

type WalletClientOptions = {
  account?: `0x${string}` | Account
  onFinalityApiKey?: string
}

export const getEvmNetworkWalletClient = (
  network: EthNetwork,
  nativeToken: Token,
  options: WalletClientOptions = {},
): WalletClient => {
  const chain = getChainFromEvmNetwork(network, nativeToken, {
    onFinalityApiKey: options.onFinalityApiKey,
  })

  const transport = getTransportForEvmNetwork(network, options)

  return createWalletClient({ chain, transport, account: options.account })
}
