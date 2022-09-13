import { DEBUG } from "@core/constants"
import { ChangePasswordRequest } from "@core/domains/app/types"
import { KeyringPair } from "@polkadot/keyring/types"
import keyring from "@polkadot/ui-keyring"
import * as Sentry from "@sentry/browser"
import { Err, Ok, Result } from "ts-results"

import seedPhraseStore, { encryptSeed } from "../accounts/store"

export const changePassword = async ({
  currentPw,
  newPw,
}: Pick<ChangePasswordRequest, "currentPw" | "newPw">): Promise<
  Result<boolean, "Error changing password">
> => {
  const pairs = keyring.getPairs()

  // keep track of which pairs have been successfully migrated
  const successfulPairs: KeyringPair[] = []
  let seedPhraseMigrated = false
  try {
    // this should be done in a tx, if any of them fail then they should be rolled back
    pairs.forEach((pair) => {
      pair.decodePkcs8(currentPw)
      keyring.encryptAccount(pair, newPw)

      successfulPairs.push(pair)
    })

    // now migrate seed phrase store password
    const seed = await seedPhraseStore.getSeed(currentPw)
    const cipher = await encryptSeed(seed, newPw)
    await seedPhraseStore.set({ cipher })
    seedPhraseMigrated = true
  } catch (error) {
    // eslint-disable-next-line no-console
    DEBUG && console.error("Error migrating password: ", error)
    successfulPairs?.forEach((pair) => {
      pair.decodePkcs8(newPw)
      keyring.encryptAccount(pair, currentPw)
    })

    if (seedPhraseMigrated) {
      // revert seedphrase conversion
      const seed = await seedPhraseStore.getSeed(newPw)
      const cipher = await encryptSeed(seed, currentPw)
      await seedPhraseStore.set({ cipher })
    }

    Sentry.captureException(error)
    return Err("Error changing password")
  }
  // success
  return Ok(true)
}
