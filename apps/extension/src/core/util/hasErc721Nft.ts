import { AccountType } from "@core/domains/accounts/types"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import keyring from "@polkadot/ui-keyring"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { parseAbi } from "viem"

import { abiErc721 } from "./abi"

type Address = `0x${string}`

export const hasErc721Nft = async ({
  evmNetworkId,
  contractAddress,
}: {
  evmNetworkId: EvmNetworkId
  contractAddress: Address
}): Promise<Record<Address, boolean>> => {
  const evmAddresses = keyring
    .getPairs()
    .filter(({ type, meta }) => type === "ethereum" && meta.origin !== AccountType.Watched)
    .map(({ address }) => address)

  const client = await chainConnectorEvm.getPublicClientForEvmNetwork(evmNetworkId)
  if (!client) throw new Error(`Unable to connect to EVM network: ${evmNetworkId}`)

  const data = await client.multicall({
    contracts: evmAddresses.map((address) => ({
      address: contractAddress,
      abi: parseAbi(abiErc721),
      functionName: "balanceOf",
      args: [address],
    })),
  })

  return Object.fromEntries(
    evmAddresses.map((address, i) => [address, (data[i].result as bigint) > 0n])
  )
}
