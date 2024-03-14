import { decrypt, encrypt } from "@metamask/browser-passworder"
import { assert, isObject } from "@polkadot/util"
import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

import { StorageProvider } from "../../../libs/Store"
import { LegacySeedObj, decryptLegacyMnemonicObject } from "./helpers"

const storageKey = "nursery"

export type SeedPhraseData = {
  cipher?: string
  confirmed: boolean
}

export const encryptMnemonic = async (seed: string, password: string) => {
  const cipher = await encrypt(password, seed)

  const checkedSeed = await decrypt(password, cipher)
  assert(seed === checkedSeed, "Seed encryption failed")

  return cipher
}

export class SeedPhraseStore extends StorageProvider<SeedPhraseData> {
  public async add(
    seed: string,
    password: string,
    confirmed = false
  ): Promise<Result<boolean, "Seed already exists in SeedPhraseStore">> {
    const storedCipher = await this.get("cipher")
    if (storedCipher) return Err("Seed already exists in SeedPhraseStore")

    const cipher = await encryptMnemonic(seed, password)
    await this.set({ cipher, confirmed })
    return Ok(true)
  }

  public async setConfirmed(confirmed = false) {
    await this.set({ confirmed })
    return true
  }

  public async getSeed(
    password: string
  ): Promise<
    Result<string | undefined, "Incorrect password" | "Unable to decrypt seed" | "No seed present">
  > {
    let seed: string
    const cipher = await this.get("cipher")
    if (!cipher) return Ok(undefined)

    try {
      // eslint-disable-next-line no-var
      var decryptedSeed = (await decrypt(password, cipher)) as string | LegacySeedObj
    } catch (e) {
      log.error(e)
      return Err("Incorrect password")
    }

    try {
      if (isObject(decryptedSeed)) {
        const unpackResult = decryptLegacyMnemonicObject(decryptedSeed)
        if (unpackResult.err) throw new Error(unpackResult.val)
        seed = unpackResult.val
      } else {
        seed = decryptedSeed
      }
    } catch (e) {
      log.error(e)
      return Err("Unable to decrypt seed")
    }

    return Ok(seed)
  }
}

export const createLegacySeedPhraseStore = () => {
  return new SeedPhraseStore(storageKey)
}

export const createLegacyVerifierCertificateMnemonicStore = () => {
  return new SeedPhraseStore("verifierCertificateMnemonic")
}
