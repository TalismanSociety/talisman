import { formatSuri } from "@core/domains/accounts/helpers"
import { KeypairType } from "@polkadot/util-crypto/types"

import { addressFromSuri } from "./addressFromSuri"

const TEST_MNEMONIC = "test test test test test test test test test test test junk"

/**
 *
 * Don't call this from front-end as it loads a heavy wasm blob
 *
 */
export const isValidDerivationPath = (derivationPath: string, type: KeypairType = "sr25519") => {
  if (typeof derivationPath !== "string") return false
  return !!addressFromSuri(formatSuri(TEST_MNEMONIC, derivationPath), type)
}
