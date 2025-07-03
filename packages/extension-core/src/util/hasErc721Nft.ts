import { EthNetworkId } from "@talismn/chaindata-provider"
import { isAccountAddressEthereum, isAccountOwned } from "@talismn/keyring"
import { parseAbi } from "viem"

import { keyringStore } from "../domains/keyring/store"
import { chainConnectorEvm } from "../rpcs/chain-connector-evm"
import { abiErc721 } from "./abi"

type Address = `0x${string}`

export const hasErc721Nft = async ({
  evmNetworkId,
  contractAddress,
}: {
  evmNetworkId: EthNetworkId
  contractAddress: Address
}): Promise<Record<Address, boolean>> => {
  const accounts = await keyringStore.getAccounts()
  const evmAddresses = accounts
    .filter(isAccountAddressEthereum)
    .filter(isAccountOwned)
    .map(({ address }) => address)

  if (!evmAddresses.length) return {}

  const client = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
  if (!client) throw new Error(`Unable to connect to EVM network: ${evmNetworkId}`)

  const data = await Promise.all(
    evmAddresses.map((address) =>
      client.readContract({
        address: contractAddress,
        abi: parseAbi(abiErc721),
        functionName: "balanceOf",
        args: [address],
      }),
    ),
  )

  return Object.fromEntries(evmAddresses.map((address, i) => [address, data[i] > 0n]))
}
