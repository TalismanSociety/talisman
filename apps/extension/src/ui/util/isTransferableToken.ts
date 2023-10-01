import { Token } from "@talismn/chaindata-provider"

// on substrate, there could be multiple tokens with same symbol on a same chain (ACA, KINT..)
// a good fix would be to detect on subsquid side if ANY account has tokens, if not the token shouldn't be included in github tokens file
// until then we hardcode an exclusion list here :
// ACA, BNC and KAR use native (orml won't work)
// INTR, KINT and MGX use orml (native won't work)
export const UNTRANSFERABLE_TOKENS = [
  "bifrost-kusama-substrate-tokens-bnc",
  "bifrost-polkadot-substrate-tokens-bnc",
  "interlay-substrate-native-intr",
  "kintsugi-substrate-native-kint",
  "mangata-substrate-native-mgx",
]

export const isTransferableToken = (t: Token) => {
  if (UNTRANSFERABLE_TOKENS.includes(t.id)) return false

  switch (t.type) {
    case "substrate-native":
    case "substrate-assets":
    case "substrate-tokens":
    case "substrate-psp22":
    case "substrate-equilibrium":
    case "evm-erc20":
    case "evm-native":
      return true
    default:
      return false
  }
}
