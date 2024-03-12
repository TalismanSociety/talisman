import { KeypairType } from "@polkadot/util-crypto/types"

import { formatSuri } from "../domains/accounts/helpers"
import { addressFromSuri } from "./addressFromSuri"

const TEST_MNEMONIC = "test test test test test test test test test test test junk"

/**
 *
 * Don't call this from front-end as it loads a heavy wasm blob
 *
 */
export const isValidDerivationPath = (derivationPath: string, type: KeypairType) => {
  if (typeof derivationPath !== "string") return false
  try {
    const suri = formatSuri(TEST_MNEMONIC, derivationPath)
    return !!addressFromSuri(suri, type)
  } catch (err) {
    return false
  }
}
