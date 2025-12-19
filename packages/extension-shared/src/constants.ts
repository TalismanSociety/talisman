const PORT_SUFFIX =
  process.env.BUILD !== "production" ? `-${process.env.BUILD}-${process.env.RELEASE}` : ""
export const PORT_EXTENSION = `talisman-extension${PORT_SUFFIX}`
export const PORT_CONTENT = `talisman-content${PORT_SUFFIX}`
export const DEBUG = process.env.DEBUG === "true"
export const TEST = process.env.NODE_ENV === "test"
export const DEFAULT_ETH_CHAIN_ID = 1 //Ethereum mainnet

export const IS_FIREFOX = process.env.BROWSER === "firefox"

export const IPFS_GATEWAY = "https://talisman.mypinata.cloud/ipfs/"

export const TALISMAN_CONFIG_URL = "https://talismansociety.github.io/talisman-config/config.toml"

export const BLOCKAID_API_URL = "https://bap.talisman.xyz"
export const TAOSTATS_BASE_PATH = process.env.TAOSTATS_BASE_PATH || "https://tsp.talisman.xyz"
export const RAMPS_COINBASE_API_BASE_PATH = "https://coinbase-api.talisman.xyz"
export const RAMPS_COINBASE_PAY_URL = "https://pay.coinbase.com"
export const RAMPS_RAMP_API_URL = "https://ramp-api.talisman.xyz"
export const ASSET_DISCOVERY_API_URL = "https://ada.talisman.xyz"

export const TALISMAN_WEB_APP_DOMAIN = "app.talisman.xyz"
export const TALISMAN_WEB_APP_URL = "https://app.talisman.xyz"
export const TALISMAN_WEB_APP_NFTS_URL = "https://app.talisman.xyz/nfts"
export const TALISMAN_WEB_APP_STAKING_URL = "https://app.talisman.xyz/staking"
export const TALISMAN_WEB_APP_STAKING_POSITIONS_URL = "https://app.talisman.xyz/staking/positions"
export const TALISMAN_WEB_APP_SWAP_URL = "https://app.talisman.xyz/transport/swap"

export const SIGNET_LANDING_URL = "https://talisman.xyz/signet"
export const SIGNET_APP_URL = "https://signet.talisman.xyz"

// Wallet-specific invite link
export const DISCORD_TALISMAN_URL = "https://discord.gg/EF3Zf4R5bD"

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
export const CONNECT_LEDGER_DOCS_URL = `${TALISMAN_DOCS_URL_PREFIX}/start/importing-external-wallets/import-from-ledger`

// Images
export const UNKNOWN_TOKEN_URL = "/images/unknown-token.svg"
export const UNKNOWN_NETWORK_URL = "/images/unknown-network.svg"

export const LEDGER_ETHEREUM_MIN_VERSION = "1.9.19"
