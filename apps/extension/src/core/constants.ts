export const PORT_EXTENSION = "talisman-extension"
export const PORT_CONTENT = "talisman-content"
export const DEBUG = process.env.BUILD !== "production"
export const DEFAULT_ETH_CHAIN_ID = 1 //Ethereum mainnet

export const DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE = ["polkadot-native-dot", "kusama-native-ksm"]
export const DEFAULT_PORTFOLIO_TOKENS_ETHEREUM = [
  "1-native-eth",
  "moonbeam-native-glmr",
  "moonriver-native-movr",
]

// those are suffixed by chainId or networkId for dedupping chains
export const DEFAULT_SEND_FUNDS_TOKEN_SUBSTRATE = "polkadot-native-dot-polkadot"
export const DEFAULT_SEND_FUNDS_TOKEN_ETHEREUM = "1-native-eth-1"
