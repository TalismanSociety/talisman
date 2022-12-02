export const PORT_EXTENSION = "talisman-extension"
export const PORT_CONTENT = "talisman-content"
export const DEBUG = process.env.BUILD !== "production" && process.env.NODE_ENV !== "test"
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

// talisman onfinality api key
export const API_KEY_ONFINALITY = "e1b2f3ea-f003-42f5-adf6-d2e6aa3ecfe4"
