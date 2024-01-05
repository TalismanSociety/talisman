import { chainConnectors } from "@core/rpcs/balance-modules"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { OnChainId, OnChainIds } from "@talismn/on-chain-id"

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
