const RELAY_TOKENS = ["polkadot-substrate-native", "kusama-substrate-native"]
const PUBLIC_GOODS_TOKENS = [
  "polkadot-asset-hub-substrate-native",
  "kusama-asset-hub-substrate-native",
]

export const sortChains = (a: string, b: string) => {
  // polkadot and kusama should be checked first
  if (RELAY_TOKENS.includes(a)) return -1
  if (RELAY_TOKENS.includes(b)) return 1
  if (PUBLIC_GOODS_TOKENS.includes(a)) return -1
  if (PUBLIC_GOODS_TOKENS.includes(b)) return 1
  return 0
}
