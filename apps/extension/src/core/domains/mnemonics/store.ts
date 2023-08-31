import { StorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { decrypt, encrypt } from "@metamask/browser-passworder"
import { assert } from "@polkadot/util"
import { mnemonicValidate } from "@polkadot/util-crypto"
import md5 from "blueimp-md5"
import { Err, Ok, Result } from "ts-results"

const storageKey = "seeds"

export enum SOURCES {
  Imported = "imported",
  Generated = "generated",
  Legacy = "legacy",
}

export type MnemonicData = {
  id: string
  name: string
  cipher?: string
  source: SOURCES
  confirmed: boolean
}

export type MnemonicsStoreData = Record<string, MnemonicData>

export enum MnemonicErrors {
  IncorrectPassword = "Incorrect password",
  InvalidMnemonic = "Invalid mnemonic",
  UnableToDecrypt = "Unable to decrypt mnemonic",
  UnableToEncrypt = "Unable to encrypt mnemonic",
  NoMnemonicPresent = "No mnemonic present",
  MnemonicNotFound = "Mnemonic not found",
  AlreadyExists = "Mnemonic already exists in MnemonicsStore",
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

const cleanupMnemonic = (mnemonic: string) => {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ")
}

export class MnemonicsStore extends StorageProvider<MnemonicsStoreData> {
  public async add(
    name: string,
    seed: string,
    password: string,
    source: SOURCES = SOURCES.Imported,
    confirmed = false
  ): Promise<Result<string, MnemonicErrors.AlreadyExists | MnemonicErrors.InvalidMnemonic>> {
    if (!mnemonicValidate(seed)) return Err(MnemonicErrors.InvalidMnemonic)

    const cleanMnemonic = cleanupMnemonic(seed)
    const id = md5(cleanMnemonic)
    const status = await this.checkSeedExists(cleanMnemonic)
    if (status) return Err(MnemonicErrors.AlreadyExists)

    const cipher = await encryptMnemonic(cleanMnemonic, password)
    await this.set({ [id]: { name, id, source, cipher, confirmed } })
    return Ok(id)
  }

  public async setConfirmed(id: string, confirmed = false) {
    const existing = await this.get(id)
    if (!existing) throw new Error("Mnemonic not found")
    await this.set({ [id]: { ...existing, confirmed } })
    return true
  }

  public async setName(id: string, name: string) {
    const existing = await this.get(id)
    if (!existing) throw new Error("Mnemonic not found")
    await this.set({ [id]: { ...existing, name } })
    return true
  }

  public async hasUnconfirmed() {
    const seeds = await this.get()
    return Object.values(seeds).some(({ confirmed }) => !confirmed)
  }

  public async checkSeedExists(seed: string): Promise<boolean> {
    const hash = md5(cleanupMnemonic(seed))
    return !!(await this.get(hash))
  }

  public async getExistingId(mnemonic: string): Promise<string | null> {
    const hash = md5(cleanupMnemonic(mnemonic))
    return (await this.get(hash)) ? hash : null
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

export const mnemonicsStore = new MnemonicsStore(storageKey)
