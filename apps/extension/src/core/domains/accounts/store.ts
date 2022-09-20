import { SubscribableStorageProvider } from "@core/libs/Store"
import passworder from "@metamask/browser-passworder"
import { assert, isObject } from "@polkadot/util"
import { Err, Ok, Result } from "ts-results"

const storageKey = "nursery"

type LEGACY_SEED_PREFIX = "----"
const LEGACY_SEED_PREFIX = "----"

type LegacySeedObj = {
  seed: `${LEGACY_SEED_PREFIX}${string}`
}

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

const legacyUnpackSeed = ({ seed }: LegacySeedObj): Result<string, "Unable to decrypt seed"> => {
  if (!seed.startsWith(LEGACY_SEED_PREFIX)) return Err("Unable to decrypt seed")
  const seedString = seed.split(LEGACY_SEED_PREFIX)[1]
  return Ok(seedString)
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
      const decryptedSeed = await passworder.decrypt<string | LegacySeedObj>(password, cipher)
      if (isObject(decryptedSeed)) {
        const unpackResult = legacyUnpackSeed(decryptedSeed)
        if (unpackResult.err) throw new Error(unpackResult.val)
        seed = unpackResult.val
      } else {
        seed = decryptedSeed
      }
    } catch (e) {
      return Err("Incorrect pass phrase")
    }
    return Ok(seed)
  }
}

const seedPhraseStore = new SeedPhraseStore(storageKey)

export default seedPhraseStore
