export const PORT_EXTENSION = `talisman-extension${
  process.env.NODE_ENV !== "production" && `-${process.env.NODE_ENV}-${process.env.RELEASE}`
}`
export const PORT_CONTENT = `talisman-content${
  process.env.NODE_ENV !== "production" && `-${process.env.NODE_ENV}-${process.env.RELEASE}`
}`
export const DEBUG = !["production", "test", "canary"].includes(process.env.NODE_ENV)
export const TEST = process.env.NODE_ENV === "test"
export const DEFAULT_ETH_CHAIN_ID = 1 //Ethereum mainnet

export const IS_FIREFOX = navigator.userAgent.toLowerCase().includes("firefox")

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

export const TALISMAN_WEB_APP_DOMAIN = "app.talisman.xyz"
export const TALISMAN_WEB_APP_URL = "https://app.talisman.xyz"
export const TALISMAN_WEB_APP_NFTS_URL = "https://app.talisman.xyz/nfts"
export const TALISMAN_WEB_APP_STAKING_URL = "https://app.talisman.xyz/staking"
export const TALISMAN_WEB_APP_CROWDLOANS_URL = "https://app.talisman.xyz/crowdloans"
export const TALISMAN_WEB_APP_TRANSPORT_URL = "https://app.talisman.xyz/transfer/transport"

export const SIGNET_LANDING_URL = "https://talisman.xyz/signet"
export const SIGNET_APP_URL = "https://signet.talisman.xyz"

// Used for testing the full buying flow
// The tokens available at this endpoint are not in sync with the production endpoint
// export const BANXA_URL = "https://talisman.banxa-sandbox.com/"
export const BANXA_URL = "https://checkout.banxa.com/"

export const POLKADOT_VAULT_DOCS_URL =
  "https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/import-from-parity-signer-or-polkadot-vault"
export const RELEASE_NOTES_URL =
  "https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes"
export const MNEMONIC_BACKUP_DOCS_URL =
  "https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/back-up-your-secret-phrase"
export const UNKNOWN_TOKEN_URL = "/images/unknown-token.svg"
export const UNKNOWN_NETWORK_URL = "/images/unknown-network.svg"

export const LEDGER_ETHEREUM_MIN_VERSION = "1.9.19"
export const LEDGER_POLKADOT_MIN_VERSION = "1.25.0"
