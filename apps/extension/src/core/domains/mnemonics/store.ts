import { StorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { decrypt, encrypt } from "@metamask/browser-passworder"
import { assert, isObject } from "@polkadot/util"
import { nanoid } from "nanoid"
import { Err, Ok, Result } from "ts-results"

import { LegacySeedObj, legacyDecryptSeed } from "./legacy/helpers"

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

export const encryptMnemonic = async (seed: string, password: string) => {
  const cipher = await encrypt(password, seed)

  const checkedSeed = await decrypt(password, cipher)
  assert(seed === checkedSeed, MnemonicErrors.UnableToEncrypt)

  return cipher
}

export const decryptMnemonic = async (
  cipher: string,
  password: string
): Promise<Result<string, MnemonicErrors.IncorrectPassword | MnemonicErrors.UnableToDecrypt>> => {
  let mnemonic: DecryptedMnemonic
  try {
    mnemonic = (await decrypt(password, cipher)) as DecryptedMnemonic
  } catch (e) {
    log.error("Error decrypting mnemonic: ", e)
    return Err(MnemonicErrors.IncorrectPassword)
  }

  try {
    if (isObject(mnemonic)) {
      const unpackResult = legacyDecryptSeed(mnemonic)
      if (unpackResult.err) throw new Error(unpackResult.val)
      mnemonic = unpackResult.val
    }
  } catch (e) {
    log.error(e)
    return Err(MnemonicErrors.UnableToDecrypt)
  }
  return Ok(mnemonic)
}

type DecryptedMnemonic = LegacySeedObj | string

export class SeedPhraseStore extends StorageProvider<SeedPhraseStoreData> {
  public async add(
    name: string,
    seed: string,
    password: string,
    source: SOURCES = SOURCES.Imported,
    confirmed = false
  ): Promise<Result<string, MnemonicErrors.AlreadyExists>> {
    const id = nanoid()
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

  public async checkSeedExists(seed: string, password: string) {
    const cipher = await encryptMnemonic(seed, password)
    const seeds = await this.get()
    const existing = Object.values(seeds).find((s) => s.cipher === cipher)
    return !!existing
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
    if (decryptResult.err) return decryptResult

    return Ok(decryptResult.val)
  }
}

export const seedPhraseStore = new SeedPhraseStore(storageKey)
