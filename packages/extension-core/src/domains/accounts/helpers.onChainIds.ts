import { OnChainId, OnChainIds, ResolvedNames } from "@talismn/on-chain-id"

import { chainConnectors } from "../../rpcs/balance-modules"
import { getTypeRegistry } from "../../util/getTypeRegistry"

const chainIdAlephZero = "aleph-zero"
const aznsSupportedChainIdAlephZero = "alephzero"

export const resolveNames = async (names: string[]): Promise<ResolvedNames> =>
  (await getOnChainId()).resolveNames(names)

export const lookupAddresses = async (addresses: string[]): Promise<OnChainIds> =>
  (await getOnChainId()).lookupAddresses(addresses)

const getOnChainId = async () => {
  const { registry: registryAlephZero } = await getTypeRegistry(chainIdAlephZero)

  return new OnChainId({
    registryAlephZero,
    chainConnectors,

    chainIdAlephZero,
    aznsSupportedChainIdAlephZero,
  })
}
