import { Keyring } from "@polkadot/keyring"
import { KeypairType } from "@polkadot/util-crypto/types"

/**
 *
 * Don't call this from front-end as it loads a heavy wasm blob
 *
 * @param suri Substrate URI : mnemonic with optionally appended derivation path
 * @param type
 * @returns address of the target keypair
 */
export const addressFromSuri = (suri: string, type: KeypairType = "sr25519") => {
  // standalone/disposable keyring, this is not the one that stores user's keys
  const keyring = new Keyring({ type })

  // create an account from mnemonic in it, just to get corresponding address
  // addFromUri supports mnemonic with optional appended derivation path
  const { address } = keyring.addFromUri(suri)

  return address
}
