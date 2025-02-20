import { XcmV3Junctions } from "@polkadot-api/descriptors"
import { Token, TokenId, TokenList } from "@talismn/chaindata-provider"
import { Chain } from "extension-core"
import { log } from "extension-shared"
import { values } from "lodash"

type MultiLocation = {
  parents: number
  interior: XcmV3Junctions
}

export const getMultiLocationTokenId = (
  location: MultiLocation,
  chain: Chain,
  tokens: TokenList,
): TokenId | null => {
  if (location.interior.type === "Here" && chain.nativeToken?.id) {
    // native token
    return chain.nativeToken.id
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
            token.chain.id === chain.id &&
            token.assetId === String(assetId),
        )?.id ?? null
      )
    }
  }

  // TODO missing cases
  // shouldnt be a problem though as for now this method is only used to find fee tokens
  log.warn("Failed to find token id for location", { location, chain })

  return null
}
