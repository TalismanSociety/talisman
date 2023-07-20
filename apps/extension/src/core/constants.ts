export const PORT_EXTENSION = "talisman-extension"
export const PORT_CONTENT = "talisman-content"
export const DEBUG = !["production", "test", "canary"].includes(process.env.NODE_ENV)
export const TEST = process.env.NODE_ENV === "test"
export const DEFAULT_ETH_CHAIN_ID = 1 //Ethereum mainnet

export const IS_FIREFOX = navigator.userAgent.toLowerCase().includes("firefox")

/**
 * A list of tokens to show by default for empty substrate accounts
 */
export const DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE = [
  "polkadot-substrate-native-dot",
  "kusama-substrate-native-ksm",
]
/**
 * A list of tokens to show by default for empty ethereum accounts
 */
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
export const TALISMAN_WEB_APP_NFTS_URL = "https://app.talisman.xyz/nfts"
export const TALISMAN_CONFIG_URL = "https://talismansociety.github.io/talisman-config/config.toml"

// Used for testing the full buying flow
// The tokens available at this endpoint are not in sync with the production endpoint
// export const BANXA_URL = "https://talisman.banxa-sandbox.com/"
export const BANXA_URL = "https://talisman.banxa.com/"

export const NOM_POOL_SUPPORTED_CHAINS = ["polkadot"]
export const NOM_POOL_MIN_DEPOSIT: Record<string, string> = {
  polkadot: "10000000000",
}

export const POLKADOT_VAULT_DOCS_URL =
  "https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/import-from-parity-signer-or-polkadot-vault"
export const RELEASE_NOTES_URL =
  "https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes"

export const UNKNOWN_TOKEN_URL = "/images/unknown-token.svg"
export const UNKNOWN_NETWORK_URL = "/images/unknown-network.svg"
