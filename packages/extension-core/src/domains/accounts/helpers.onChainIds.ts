import { OnChainId, OnChainIds, ResolvedNames } from "@talismn/on-chain-id"

import { chainConnectors } from "../../rpcs/balance-modules"

const onChainId = new OnChainId({ chainConnectors })

export const resolveNames = async (names: string[]): Promise<ResolvedNames> =>
  onChainId.resolveNames(names)

export const lookupAddresses = async (addresses: string[]): Promise<OnChainIds> =>
  onChainId.lookupAddresses(addresses)
