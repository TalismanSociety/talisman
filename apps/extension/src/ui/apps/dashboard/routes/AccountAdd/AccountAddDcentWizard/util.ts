import { log } from "@core/log"
import { Token } from "@talismn/chaindata-provider"
import DcentWebConnector from "dcent-web-connector"

export type DcentAccountInfo = {
  name: string
  coinType: string
  derivationPath: string
  tokens: Token[]
}

// TODO move to chaindata
export const DCENT_COIN_NAME_TO_TOKEN_ID: Record<string, string> = {
  "ETHEREUM": "1-evm-native-eth",
  "POLYGON": "137-evm-native-matic",
  "0X2791BCA1F2DE4": "137-evm-erc20-0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  "POLKADOT": "polkadot-substrate-native-dot",
  // "KUSAMA": "kusama-substrate-native-dot", unsupported dcent side
  "BSC": "56-evm-native-bnb",
}

export const getDcentCoinTypeFromToken = (token: Token) => {
  if (!token) return undefined

  switch (token.type) {
    case "evm-erc20":
    case "evm-native":
      return DcentWebConnector.coinType.ETHEREUM
    case "substrate-native":
      return DcentWebConnector.coinType.POLKADOT
    default: {
      // TODO sentry
      log.warn("Unsupported D'CENT token type : " + token.type, token)
    }
  }
}
