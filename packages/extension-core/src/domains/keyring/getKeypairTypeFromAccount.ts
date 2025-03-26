import { KeypairType } from "@polkadot/util-crypto/types"
import { isEthereumAddress } from "@talismn/crypto"
import { Account } from "@talismn/keyring"

// used when injecting accounts into dapps
export const getAccountKeypairType = (account: Account): KeypairType => {
  switch (account.type) {
    case "keypair":
      return account.curve as KeypairType
    case "ledger-ethereum":
      return "ethereum"
    case "ledger-polkadot":
      return "ed25519"
    case "polkadot-vault":
      return "sr25519" // TODO confirm this
    case "signet":
      return "sr25519"
    case "watch-only":
      return isEthereumAddress(account.address) ? "ethereum" : "sr25519"
    default:
      throw new Error("Unsupported account type")
  }
}
