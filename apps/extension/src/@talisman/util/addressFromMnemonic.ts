import { Keyring } from "@polkadot/keyring"
import { KeypairType } from "@polkadot/util-crypto/types"

/**
 *
 * Don't call this from front-end as it imports heavy polkadot crypto libs
 *
 * @param mnemonicOrUri mnemonic with optionally appended derivation path
 * @param type
 * @returns address of the first keypair associated to a mnemonic
 */
export const addressFromMnemonic = (mnemonicOrUri: string, type: KeypairType = "sr25519") => {
  // standalone/disposable keyring, this is not the one that stores user's keys
  const keyring = new Keyring({ type })

  // create an account from mnemonic in it, just to get corresponding address
  // addFromUri supports mnemonic with optional appended derivation path
  const { address } = keyring.addFromUri(mnemonicOrUri)

  return address
}
