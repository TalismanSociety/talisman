import keyring from "@polkadot/ui-keyring"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { parseAbi } from "viem"

import { AccountType } from "../domains/accounts/types"
import { chainConnectorEvm } from "../rpcs/chain-connector-evm"
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
    .getAccounts()
    .filter(({ meta }) => meta.type === "ethereum" && meta.origin !== AccountType.Watched)
    .map(({ address }) => address as Address)

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
      })
    )
  )

  return Object.fromEntries(evmAddresses.map((address, i) => [address, data[i] > 0n]))
}
