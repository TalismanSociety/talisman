import { StorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { decrypt, encrypt } from "@metamask/browser-passworder"
import { assert } from "@polkadot/util"
import md5 from "blueimp-md5"
import { Err, Ok, Result } from "ts-results"

const storageKey = "seeds"

export enum SOURCES {
  Imported = "imported",
  Generated = "generated",
  Legacy = "legacy",
  Vault = "vault",
}

export type SeedPhraseData = {
  id: string
  name: string
  cipher?: string
  source: SOURCES
  confirmed: boolean
}

export type SeedPhraseStoreData = Record<string, SeedPhraseData>

export enum MnemonicErrors {
  IncorrectPassword = "Incorrect password",
  UnableToDecrypt = "Unable to decrypt mnemonic",
  UnableToEncrypt = "Unable to encrypt mnemonic",
  NoMnemonicPresent = "No mnemonic present",
  MnemonicNotFound = "Mnemonic not found",
  AlreadyExists = "Seed already exists in SeedPhraseStore",
}

export const encryptMnemonic = async (mnemonic: string, password: string) => {
  const cipher = await encrypt(password, mnemonic)

  const checkedMnemonic = await decrypt(password, cipher)
  assert(mnemonic === checkedMnemonic, MnemonicErrors.UnableToEncrypt)

  return cipher
}

export const decryptMnemonic = async (
  cipher: string,
  password: string
): Promise<Result<string, MnemonicErrors.IncorrectPassword>> => {
  try {
    const mnemonic = (await decrypt(password, cipher)) as string
    return Ok(mnemonic)
  } catch (e) {
    log.error("Error decrypting mnemonic: ", e)
    return Err(MnemonicErrors.IncorrectPassword)
  }
}

export class SeedPhraseStore extends StorageProvider<SeedPhraseStoreData> {
  public async add(
    name: string,
    seed: string,
    password: string,
    source: SOURCES = SOURCES.Imported,
    confirmed = false
  ): Promise<Result<string, MnemonicErrors.AlreadyExists>> {
    const id = md5(seed)
    const status = await this.checkSeedExists(seed)
    if (status) return Err(MnemonicErrors.AlreadyExists)

    const cipher = await encryptMnemonic(seed, password)
    await this.set({ [id]: { name, id, source, cipher, confirmed } })
    return Ok(id)
  }

  public async setConfirmed(id: string, confirmed = false) {
    const existing = await this.get(id)
    if (!existing) throw new Error("Seed not found")
    await this.set({ [id]: { ...existing, confirmed } })
    return true
  }

  public async hasUnconfirmed() {
    const seeds = await this.get()
    return Object.values(seeds).some(({ confirmed }) => !confirmed)
  }

  public async checkSeedExists(seed: string): Promise<boolean> {
    const hash = md5(seed)
    return !!(await this.get(hash))
  }

  public async getSeed(
    id: string,
    password: string
  ): Promise<
    Result<
      string | undefined,
      | MnemonicErrors.IncorrectPassword
      | MnemonicErrors.MnemonicNotFound
      | MnemonicErrors.UnableToDecrypt
    >
  > {
    const seedData = await this.get(id)
    if (!seedData) throw new Err(MnemonicErrors.MnemonicNotFound)
    const cipher = seedData.cipher
    if (!cipher) return Ok(undefined)

    const decryptResult = await decryptMnemonic(cipher, password)
    if (decryptResult.err) return Err(decryptResult.val)

    return Ok(decryptResult.val)
  }
}

export const seedPhraseStore = new SeedPhraseStore(storageKey)
