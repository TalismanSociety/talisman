import { XcmV3Junctions } from "@polkadot-api/descriptors"
import { DotNetwork, Token, TokenId, TokenList } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { values } from "lodash-es"

type MultiLocation = {
  parents: number
  interior: XcmV3Junctions
}

export const getMultiLocationTokenId = (
  location: MultiLocation,
  chain: DotNetwork,
  tokens: TokenList,
): TokenId | null => {
  if (location.interior.type === "Here") {
    // native token
    return chain.nativeTokenId
  }

  if (location.interior.type === "X2") {
    if (
      location.interior.value[0].type === "PalletInstance" &&
      location.interior.value[0].value === 50 &&
      location.interior.value[1].type === "GeneralIndex"
    ) {
      // Assets pallet
      const assetId = location.interior.value[1].value
      return (
        values(tokens).find(
          (token: Token) =>
            token.type === "substrate-assets" &&
            token.networkId === chain.id &&
            BigInt(token.assetId) === assetId,
        )?.id ?? null
      )
    }
  }

  // TODO missing cases
  // shouldnt be a problem though as for now this method is only used to find fee tokens
  log.warn("Failed to find token id for location", { location, chain })

  return null
}
