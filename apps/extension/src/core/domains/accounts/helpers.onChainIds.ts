import { chainConnector } from "@core/rpcs/chain-connector"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { OnChainId, OnChainIds } from "@talismn/on-chain-id"

const chainConnectors = { substrate: chainConnector, evm: chainConnectorEvm }
const chainIdPolkadot = "polkadot"

export const resolveNames = async (names: string[]): Promise<Map<string, string | null>> =>
  (await getOnChainId()).resolveNames(names)

export const lookupAddresses = async (addresses: string[]): Promise<OnChainIds> =>
  // (await getOnChainId()).lookupAddresses(addresses) // include polkadot identities
  (await getOnChainId()).lookupEnsAddresses(addresses) // ens only

const getOnChainId = async () => {
  const { registry } = await getTypeRegistry(chainIdPolkadot)
  return new OnChainId(registry, chainConnectors)
}
