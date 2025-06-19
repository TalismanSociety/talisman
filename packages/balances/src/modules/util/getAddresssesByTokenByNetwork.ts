import { NetworkId, parseTokenId, TokenId } from "@talismn/chaindata-provider"
import { toPairs } from "lodash"

import { Address } from "../../types"

export const getAddresssesBytokenByNetwork = (
  addressesByToken: Record<TokenId, Address[]>,
): Record<NetworkId, Record<TokenId, Address[]>> => {
  const addressesByTokenByNetwork = toPairs(addressesByToken).reduce(
    (acc, [tokenId, addresses]) => {
      const networkId = parseTokenId(tokenId).networkId as NetworkId
      if (!acc[networkId]) acc[networkId] = {}
      acc[networkId][tokenId] = addresses as Address[]

      return acc
    },
    {} as Record<NetworkId, Record<TokenId, Address[]>>,
  )

  return addressesByTokenByNetwork
}
