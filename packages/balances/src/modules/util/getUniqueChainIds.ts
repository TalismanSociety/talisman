import { NetworkId, TokenList } from "@talismn/chaindata-provider"

import { AddressesByToken } from "../../types"

export const getUniqueChainIds = (
  addressesByToken: AddressesByToken<{ id: string }>,
  tokens: TokenList,
): NetworkId[] => [
  ...new Set(
    Object.keys(addressesByToken)
      .map((tokenId) => tokens[tokenId]?.networkId)
      .flatMap((chainId) => (chainId ? [chainId] : [])),
  ),
]
