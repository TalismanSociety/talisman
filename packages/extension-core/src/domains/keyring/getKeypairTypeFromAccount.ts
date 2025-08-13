import { KeypairType } from "@polkadot/util-crypto/types"
import { isEthereumAddress } from "@talismn/crypto"
import { Account } from "@talismn/keyring"

// unsafe, use only when injecting accounts into Polkadot dapps
export const getAccountKeypairType = (account: Account): KeypairType => {
  switch (account.type) {
    case "keypair":
      if (["ed25519", "sr25519", "ecdsa", "ethereum"].includes(account.curve))
        return account.curve as KeypairType
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Unsupported account type '${(account as any).type}'`)
  }
}
