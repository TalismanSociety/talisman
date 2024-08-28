import { DEBUG, log, TALISMAN_CONFIG_URL } from "extension-shared"
import toml from "toml"

import { RemoteConfigStoreData } from "../domains/app/types"

const TEST_CONTENT = `
[featureFlags]
BUY_CRYPTO = true              # shows the buy crypto button in the wallet
LINK_TX_HISTORY = true         # shows the transaction history link in the wallet
LINK_STAKING = true            # shows the staking link in the wallet
I18N = false                   # enables internationalization
USE_ONFINALITY_API_KEY = false # enables the use of the onFinality API key

[buyTokens]
tokenIds = [
    "polkadot-substrate-native-dot",   # keep old native token ids format to prevent breaking old builds
    "polkadot-substrate-native",
    "kusama-substrate-native-ksm",
    "kusama-substrate-native",
    "moonbeam-substrate-native-glmr",
    "moonbeam-substrate-native",
    "moonriver-substrate-native-movr",
    "moonriver-substrate-native",
    "ternoa-substrate-native-caps",
    "ternoa-substrate-native",
    "1-evm-native-eth",
    "1-evm-native",
    "56-evm-native-bnb",
    "56-evm-native",
    "137-evm-native-matic",
    "137-evm-native",
]

[coingecko]
apiUrl = "https://cgp.talisman.xyz"

[nominationPools]
polkadot=[12, 14]
kusama=[15]
avail=[66, 68, 2]
vara=[8]
aleph-zero=[47]
`

export const fetchRemoteConfig = async () => {
  log.debug("Fetching config.toml")
  const response = await fetch(TALISMAN_CONFIG_URL)

  if (!response.ok)
    throw new Error(`Unable to fetch config.toml: ${response.status} ${response.statusText}`)

  const text = DEBUG ? TEST_CONTENT : await response.text()
  try {
    return toml.parse(text) as RemoteConfigStoreData
  } catch (e) {
    throw new Error("Unable to parse config.toml", { cause: e })
  }
}
