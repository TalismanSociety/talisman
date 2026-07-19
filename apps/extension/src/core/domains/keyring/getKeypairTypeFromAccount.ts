import { isEthereumAddress } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"

import type { PjsKeypairType } from "./migration-utils"

// unsafe, use only when injecting accounts into Polkadot dapps
export const getAccountKeypairType = (account: Account): PjsKeypairType => {
  switch (account.type) {
    case "keypair":
      if (["ed25519", "sr25519", "ecdsa", "ethereum"].includes(account.curve))
        return account.curve as PjsKeypairType
      throw new Error(`Unsupported account curve '${account.curve}'`)
    case "ledger-ethereum":
      return "ethereum"
    case "ledger-polkadot":
      return "ed25519"
    case "polkadot-vault":
      return "sr25519" // can be either sr25519 or ed25519, but sr25519 by default
    case "signet":
    case "contact":
    case "watch-only":
      // it is not possible to determine the curve of a polkadot address, assume sr25519
      return isEthereumAddress(account.address) ? "ethereum" : "sr25519"
    default:
      // biome-ignore lint/suspicious/noExplicitAny: legacy
      throw new Error(`Unsupported account type '${(account as any).type}'`)
  }
}
