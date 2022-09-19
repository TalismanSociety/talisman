import { SubscribableStorageProvider } from "@core/libs/Store"
import passworder from "@metamask/browser-passworder"
import { assert } from "@polkadot/util"
import { Err, Ok, Result } from "ts-results"

const storageKey = "nursery"

export type SeedPhraseData = {
  cipher: string
  address: string
  confirmed: boolean
}

export const encryptSeed = async (seed: string, password: string) => {
  const cipher = await passworder.encrypt(password, seed)

  const checkedSeed = await passworder.decrypt(password, cipher)
  assert(seed === checkedSeed, "Seed encryption failed")

  return cipher
}

export class SeedPhraseStore extends SubscribableStorageProvider<
  SeedPhraseData,
  "pri(mnemonic.subscribe)"
> {
  public async add(
    seed: string,
    address: string,
    password: string,
    confirmed = false
  ): Promise<Result<boolean, "Seed already exists in SeedPhraseStore">> {
    const storedCipher = await this.get("cipher")
    if (storedCipher) return Err("Seed already exists in SeedPhraseStore")

    const cipher = await encryptSeed(seed, password)
    await this.set({ cipher, address, confirmed })
    return Ok(true)
  }

  public async setConfirmed(confirmed = false) {
    await this.set({ confirmed })
    return true
  }

  public async getSeed(password: string): Promise<Result<string, "Incorrect pass phrase">> {
    let seed: string
    const cipher = await this.get("cipher")
    try {
      seed = await passworder.decrypt<string>(password, cipher)
    } catch (e) {
      return Err("Incorrect pass phrase")
    }
    return Ok(seed)
  }
}

const seedPhraseStore = new SeedPhraseStore(storageKey)

export default seedPhraseStore
