import { ChainId, TokenList } from "@talismn/chaindata-provider"

import { AddressesByToken } from "../../types"

export const getUniqueChainIds = (
  addressesByToken: AddressesByToken<{ id: string }>,
  tokens: TokenList,
): ChainId[] => [
  ...new Set(
    Object.keys(addressesByToken)
      .map((tokenId) => tokens[tokenId]?.chain?.id)
      .flatMap((chainId) => (chainId ? [chainId] : [])),
  ),
]
