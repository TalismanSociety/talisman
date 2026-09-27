import type { Network } from "./chaindata"
import log from "./log"

/** mirrors AccountPlatform from @talismn/crypto, which this package does not depend on */
type AccountPlatform = "ethereum" | "polkadot" | "bitcoin" | "solana"

export const isAccountPlatformCompatibleWithNetwork = (
  network: Network,
  platform: AccountPlatform
) => {
  switch (network.platform) {
    case "ethereum":
      return platform === "ethereum"
    case "solana":
      return platform === "solana"
    case "polkadot": {
      switch (network.account) {
        case "secp256k1":
          return platform === "ethereum"
        case "*25519":
          return platform === "polkadot"
        default:
          throw new Error(`Unsupported polkadot network account type ${network.account}`)
      }
    }
    default:
      log.warn("Unsupported network platform", network)
      throw new Error("Unsupported network platform")
  }
}
