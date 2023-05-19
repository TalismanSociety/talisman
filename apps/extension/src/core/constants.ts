export const PORT_EXTENSION = "talisman-extension"
export const PORT_CONTENT = "talisman-content"
export const DEBUG = process.env.BUILD !== "production" && process.env.NODE_ENV !== "test"
export const TEST = process.env.NODE_ENV === "test"
export const DEFAULT_ETH_CHAIN_ID = 1 //Ethereum mainnet

export const DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE = [
  "polkadot-substrate-native-dot",
  "kusama-substrate-native-ksm",
]
export const DEFAULT_PORTFOLIO_TOKENS_ETHEREUM = [
  "1-evm-native-eth",
  "1284-evm-native-glmr",
  "1285-evm-native-movr",
]

// those are suffixed by chainId or networkId for dedupping chains
export const DEFAULT_SEND_FUNDS_TOKEN_SUBSTRATE = "polkadot-substrate-native-dot-polkadot"
export const DEFAULT_SEND_FUNDS_TOKEN_ETHEREUM = "1-evm-native-eth-1"

// talisman onfinality api key
export const API_KEY_ONFINALITY = process.env.API_KEY_ONFINALITY

export const IPFS_GATEWAY = "https://talisman.mypinata.cloud/ipfs/"

export const TALISMAN_WEB_APP_DOMAIN = "app.talisman.xyz"
export const TALISMAN_WEB_APP_NFTS_URL = "https://app.talisman.xyz/portfolio/collectibles"

export const NOM_POOL_SUPPORTED_CHAINS = ["polkadot"]
export const NOM_POOL_MIN_DEPOSIT: Record<string, string> = {
  polkadot: "10000000000",
}
