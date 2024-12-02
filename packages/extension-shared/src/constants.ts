const PORT_SUFFIX =
  process.env.BUILD !== "production" ? `-${process.env.BUILD}-${process.env.RELEASE}` : ""
export const PORT_EXTENSION = `talisman-extension${PORT_SUFFIX}`
export const PORT_CONTENT = `talisman-content${PORT_SUFFIX}`
export const DEBUG = process.env.DEBUG === "true"
export const TEST = process.env.NODE_ENV === "test"
export const DEFAULT_ETH_CHAIN_ID = 1 //Ethereum mainnet

export const IS_FIREFOX = process.env.BROWSER === "firefox"

/**
 * A list of tokens to show by default for empty substrate accounts
 */
export const DEFAULT_PORTFOLIO_TOKENS_SUBSTRATE = [
  "polkadot-substrate-native",
  "kusama-substrate-native",
]
/**
 * A list of tokens to show by default for empty ethereum accounts
 */
export const DEFAULT_PORTFOLIO_TOKENS_ETHEREUM = ["1-evm-native"]

// talisman onfinality api key
export const API_KEY_ONFINALITY = process.env.API_KEY_ONFINALITY

export const IPFS_GATEWAY = "https://talisman.mypinata.cloud/ipfs/"

export const TALISMAN_CONFIG_URL = "https://talismansociety.github.io/talisman-config/config.toml"

export const BLOWFISH_BASE_PATH = process.env.BLOWFISH_BASE_PATH || "https://bfp.talisman.xyz"
export const BLOWFISH_API_KEY = process.env.BLOWFISH_API_KEY
export const NFTS_API_KEY = process.env.NFTS_API_KEY
export const NFTS_API_BASE_PATH = process.env.NFTS_API_BASE_PATH || "https://nfts-api.talisman.xyz"

export const TALISMAN_WEB_APP_DOMAIN = "app.talisman.xyz"
export const TALISMAN_WEB_APP_URL = "https://app.talisman.xyz"
export const TALISMAN_WEB_APP_NFTS_URL = "https://app.talisman.xyz/nfts"
export const TALISMAN_WEB_APP_STAKING_URL = "https://app.talisman.xyz/staking"
export const TALISMAN_WEB_APP_CROWDLOANS_URL = "https://app.talisman.xyz/crowdloans"
export const TALISMAN_WEB_APP_SWAP_URL = "https://app.talisman.xyz/transport/swap"

export const TALISMAN_QUEST_APP_URL = "https://quest.talisman.xyz"

export const SIGNET_LANDING_URL = "https://talisman.xyz/signet"
export const SIGNET_APP_URL = "https://signet.talisman.xyz"

// Used for testing the full buying flow
// The tokens available at this endpoint are not in sync with the production endpoint
// export const BANXA_URL = "https://talisman.banxa-sandbox.com/"
export const BANXA_URL = "https://checkout.banxa.com/"

// Docs URLs

export const TALISMAN_DOCS_URL_PREFIX = "https://docs.talisman.xyz/talisman"
export const POLKADOT_VAULT_DOCS_URL = `${TALISMAN_DOCS_URL_PREFIX}/start/importing-external-wallets/import-from-polkadot-vault`
export const RELEASE_NOTES_URL = `${TALISMAN_DOCS_URL_PREFIX}/about/wallet-release-notes`
export const SECURITY_DOCS_URL = `${TALISMAN_DOCS_URL_PREFIX}/about/security`
export const MNEMONIC_BACKUP_DOCS_URL = `${TALISMAN_DOCS_URL_PREFIX}/start/installing-talisman/back-up-your-secret-phrase`
export const PRIVACY_POLICY_URL = `${TALISMAN_DOCS_URL_PREFIX}/about/privacy-policy`
export const TERMS_OF_USE_URL = `${TALISMAN_DOCS_URL_PREFIX}/about/terms-of-use`
export const BRAVE_BALANCES_URL = `${TALISMAN_DOCS_URL_PREFIX}/help-and-support/troubleshooting/balances-on-brave-not-showing`
export const TOKEN_APPROVALS_URL = `${TALISMAN_DOCS_URL_PREFIX}/navigate/using-talisman-with-a-website-dapp/token-approvals`
export const SPIRIT_KEYS_DOCS_URL = `${TALISMAN_DOCS_URL_PREFIX}/introduction/talisman-portal/spirit-keys-and-commendations#sprit-keys`
export const CONNECT_LEDGER_DOCS_URL = `${TALISMAN_DOCS_URL_PREFIX}/start/importing-external-wallets/import-from-ledger`

// Images
export const UNKNOWN_TOKEN_URL = "/images/unknown-token.svg"
export const UNKNOWN_NETWORK_URL = "/images/unknown-network.svg"

export const LEDGER_ETHEREUM_MIN_VERSION = "1.9.19"
