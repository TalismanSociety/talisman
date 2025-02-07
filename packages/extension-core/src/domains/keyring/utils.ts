import { captureException } from "@sentry/browser"
import { KeypairCurve } from "@talismn/crypto"
import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

import { getDerivationPathForCurve } from "../accounts/helpers"
import { passwordStore } from "../app/store.password"
import { keyringStore } from "./store"

// @dev: frontend might need this one too

/**
 * Backend restricted
 * @param mnemonicId
 * @param curve
 * @returns
 */
export const getNextDerivationPathForMnemonicId = async (
  mnemonicId: string,
  curve: KeypairCurve,
): Promise<
  Result<
    string,
    "Unable to get next derivation path" | "Reached maximum number of derived accounts"
  >
> => {
  try {
    const password = await passwordStore.getPassword()
    if (!password) throw new Error("Not logged in")

    const allAccounts = await keyringStore.getAccounts()
    const allAddresses = allAccounts.map(({ address }) => address)

    // for substrate check empty derivation path first, which is how pjs derives accounts
    if (["ecdsa", "ed25519", "sr25519"].includes(curve)) {
      const address = await keyringStore.getDerivedAddress(mnemonicId, "", curve, password)
      if (!allAddresses.includes(address)) return Ok("")
    }

    for (let accountIndex = 0; accountIndex <= 1000; accountIndex += 1) {
      const derivationPath = getDerivationPathForCurve(curve, accountIndex)
      const derivedAddress = await keyringStore.getDerivedAddress(
        mnemonicId,
        derivationPath,
        curve,
        password,
      )
      if (!allAddresses.includes(derivedAddress)) return Ok(derivationPath)
    }

    return Err("Reached maximum number of derived accounts")
  } catch (error) {
    log.error("Unable to get next derivation path", error)
    captureException(error)
    return Err("Unable to get next derivation path")
  }
}
