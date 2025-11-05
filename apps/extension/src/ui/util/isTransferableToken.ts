import {
  evmErc20TokenId,
  subNativeTokenId,
  subTokensTokenId,
  Token,
} from "@talismn/chaindata-provider"

// on substrate, there could be multiple tokens with same symbol on a same chain (ACA, KINT..)
// a good fix would be to detect on subsquid side if ANY account has tokens, if not the token shouldn't be included in github tokens file
// until then we hardcode an exclusion list here :
// ACA, BNC and KAR use native (orml won't work)
// INTR, KINT and MGX use orml (native won't work)
export const UNTRANSFERABLE_TOKENS = [
  subTokensTokenId("bifrost-kusama", '{"type":"Token","value":{"type":"BNC"}}'),
  subTokensTokenId("bifrost-polkadot", '{"type":"Token","value":{"type":"BNC"}}'),
  subNativeTokenId("interlay"),
  subNativeTokenId("kintsugi"),
  subNativeTokenId("mangata"),

  // specific cases
  evmErc20TokenId("137", "0x0000000000000000000000000000000000001010"), // WMATIC on Polygon
]

export const isTransferableToken = (t: Token) => {
  if (UNTRANSFERABLE_TOKENS.includes(t.id)) return false

  if (t.type === "substrate-dtao") return t.isTransferable

  return true
}
