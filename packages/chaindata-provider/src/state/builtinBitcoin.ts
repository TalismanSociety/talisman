import type { BtcNativeToken, BtcNetwork } from "../chaindata"
import type { Chaindata } from "./schema"

// TEMPORARY: bitcoin is not registered in the chaindata repo (TalismanSociety/chaindata) yet.
// Until it is, the downloaded chaindata file is enriched with these hardcoded definitions.
// Upstream entries take precedence once published — this file can then be deleted.

const BTC_LOGO =
  "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/bitcoin.webp"

const BUILTIN_BITCOIN_NETWORKS: BtcNetwork[] = [
  {
    id: "bitcoin",
    isDefault: true,
    name: "Bitcoin",
    logo: BTC_LOGO,
    nativeTokenId: "bitcoin:btc-native",
    nativeCurrency: {
      decimals: 8,
      symbol: "BTC",
      name: "Bitcoin",
      coingeckoId: "bitcoin",
      logo: BTC_LOGO,
    },
    themeColor: "#f7931a",
    blockExplorerUrls: ["https://mempool.space"],
    platform: "bitcoin",
    // mempool.space fails from the extension (no CORS headers for our origin, and we
    // declare no host_permissions), so blockstream is the only working endpoint until
    // the Talisman esplora proxy lands
    rpcs: ["https://blockstream.info/api"],
    addressPrefix: "bc",
  },
  {
    id: "bitcoin-signet",
    isTestnet: true,
    name: "Bitcoin Signet",
    logo: BTC_LOGO,
    nativeTokenId: "bitcoin-signet:btc-native",
    nativeCurrency: {
      decimals: 8,
      symbol: "sBTC",
      name: "Signet Bitcoin",
      logo: BTC_LOGO,
    },
    themeColor: "#f7931a",
    blockExplorerUrls: ["https://mempool.space/signet"],
    platform: "bitcoin",
    rpcs: ["https://mempool.space/signet/api"],
    addressPrefix: "tb",
  },
]

const BUILTIN_BITCOIN_TOKENS: BtcNativeToken[] = [
  {
    id: "bitcoin:btc-native",
    platform: "bitcoin",
    networkId: "bitcoin",
    type: "btc-native",
    symbol: "BTC",
    decimals: 8,
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    logo: BTC_LOGO,
    isDefault: true,
  },
  {
    id: "bitcoin-signet:btc-native",
    platform: "bitcoin",
    networkId: "bitcoin-signet",
    type: "btc-native",
    symbol: "sBTC",
    decimals: 8,
    name: "Signet Bitcoin",
    logo: BTC_LOGO,
    isDefault: true,
  },
]

export const enrichWithBuiltinBitcoin = (data: Chaindata): Chaindata => ({
  ...data,
  networks: [
    ...data.networks,
    ...BUILTIN_BITCOIN_NETWORKS.filter(
      (network) => !data.networks.some((n) => n.id === network.id)
    ),
  ],
  tokens: [
    ...data.tokens,
    ...BUILTIN_BITCOIN_TOKENS.filter((token) => !data.tokens.some((t) => t.id === token.id)),
  ],
})
