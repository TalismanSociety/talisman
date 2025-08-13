import { EthNetwork } from "@talismn/chaindata-provider"
import { Account, createWalletClient, WalletClient } from "viem"

import { getChainFromEvmNetwork } from "./getChainFromEvmNetwork"
import { getTransportForEvmNetwork } from "./getTransportForEvmNetwork"

type WalletClientOptions = {
  account?: `0x${string}` | Account
}

export const getEvmNetworkWalletClient = (
  network: EthNetwork,
  options: WalletClientOptions = {},
): WalletClient => {
  const chain = getChainFromEvmNetwork(network)

  const transport = getTransportForEvmNetwork(network)

  return createWalletClient({ chain, transport, account: options.account })
}
