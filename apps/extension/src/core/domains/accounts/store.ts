import { SubscribableStorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { decrypt, encrypt } from "@metamask/browser-passworder"
import { assert, isObject } from "@polkadot/util"
import { Err, Ok, Result } from "ts-results"

const storageKey = "nursery"

type LEGACY_SEED_PREFIX = "----"
export const LEGACY_SEED_PREFIX = "----"

export type LegacySeedObj = {
  seed: `${LEGACY_SEED_PREFIX}${string}`
}

export type SeedPhraseData = {
  cipher?: string
  confirmed: boolean
}

export const encryptSeed = async (seed: string, password: string) => {
  const cipher = await encrypt(password, seed)

  const checkedSeed = await decrypt(password, cipher)
  assert(seed === checkedSeed, "Seed encryption failed")

  return cipher
}

export const legacyUnpackSeed = ({
  seed,
}: LegacySeedObj): Result<string, "Unable to decrypt seed"> => {
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
    password: string,
    confirmed = false
  ): Promise<Result<boolean, "Seed already exists in SeedPhraseStore">> {
    const storedCipher = await this.get("cipher")
    if (storedCipher) return Err("Seed already exists in SeedPhraseStore")

    const cipher = await encryptSeed(seed, password)
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
        const unpackResult = legacyUnpackSeed(decryptedSeed)
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

const seedPhraseStore = new SeedPhraseStore(storageKey)

export default seedPhraseStore
