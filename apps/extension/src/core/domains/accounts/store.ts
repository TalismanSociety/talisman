import { SubscribableStorageProvider } from "@core/libs/Store"
import passworder from "@metamask/browser-passworder"
import { assert } from "@polkadot/util"

const storageKey = "nursery"

type storedSeed = {
  seed: string
}

interface SeedPhraseData {
  cipher: string
  address: string
  confirmed: boolean
}

export const encryptSeed = async (seed: string, password: string) => {
  const seedObj = { seed: `----${seed}` }

  const cipher = await passworder.encrypt(password, seedObj)

  const { seed: checkedSeed } = await passworder.decrypt<storedSeed>(password, cipher)

  assert(seedObj.seed === checkedSeed, "Seed encryption failed")

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
  ): Promise<boolean> {
    const storedCipher = await this.get("cipher")

    assert(!storedCipher, `Seed already exists in SeedPhraseStore`)

    const cipher = await encryptSeed(seed, password)
    await this.set({ cipher, address, confirmed })
    return true
  }

  public async setConfirmed(confirmed = false) {
    await this.set({ confirmed })
    return true
  }

  public async getSeed(password: string) {
    try {
      const cipher = (await this.get("cipher")) as string
      const { seed } = await passworder.decrypt<storedSeed>(password, cipher)
      if (seed.slice(0, 4) !== "----") throw new Error("Incorrect pass phrase")
      return seed.split("----")[1]
    } catch (e) {
      throw new Error("Incorrect pass phrase")
    }
  }
}

const seedPhraseStore = new SeedPhraseStore(storageKey)

export default seedPhraseStore
