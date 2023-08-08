import { log } from "@core/log"
import { Token } from "@talismn/chaindata-provider"
import DcentWebConnector from "dcent-web-connector"

export type DcentAccountInfo = {
  name: string
  coinType: string
  derivationPath: string
  tokens: Record<string, Token>
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
