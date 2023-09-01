import { Keyring } from "@polkadot/keyring"
import { KeypairType } from "@polkadot/util-crypto/types"

const TEST_MNEMONIC = "test test test test test test test test test test test junk"

/**
 *
 * Don't call this from front-end as it imports heavy polkadot crypto libs
 *
 */
export const isValidDerivationPath = (derivationPath: string, type: KeypairType = "sr25519") => {
  try {
    // standalone/disposable keyring, this is not the one that stores user's keys
    const keyring = new Keyring({ type })

    const suri =
      !!derivationPath && !derivationPath.startsWith("/")
        ? `${TEST_MNEMONIC}/${derivationPath}`
        : `${TEST_MNEMONIC}${derivationPath}`

    // simply test if keyring can derive an address from the suri
    const { address } = keyring.addFromUri(suri)
    return !!address
  } catch (err) {
    return false
  }
}
