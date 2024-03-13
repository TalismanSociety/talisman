import { decrypt } from "@metamask/browser-passworder"
import { isObject } from "@polkadot/util"
import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

type LEGACY_SEED_PREFIX = "----"
export const LEGACY_SEED_PREFIX = "----"

export type LegacySeedObj = {
  seed: `${LEGACY_SEED_PREFIX}${string}`
}

export type SeedPhraseData = {
  cipher?: string
  confirmed: boolean
}

export const decryptLegacyMnemonicObject = ({
  seed,
}: LegacySeedObj): Result<string, "Unable to decrypt seed"> => {
  if (!seed.startsWith(LEGACY_SEED_PREFIX)) return Err("Unable to decrypt seed")
  const seedString = seed.split(LEGACY_SEED_PREFIX)[1]
  return Ok(seedString)
}

type DecryptedMnemonic = LegacySeedObj | string

export enum MnemonicErrors {
  IncorrectPassword = "Incorrect password",
  UnableToDecrypt = "Unable to decrypt mnemonic",
  UnableToEncrypt = "Unable to encrypt mnemonic",
  NoMnemonicPresent = "No mnemonic present",
  MnemonicNotFound = "Mnemonic not found",
  AlreadyExists = "Seed already exists in SeedPhraseStore",
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
      const unpackResult = decryptLegacyMnemonicObject(mnemonic)
      if (unpackResult.err) throw new Error(unpackResult.val)
      mnemonic = unpackResult.val
    }
  } catch (e) {
    log.error(e)
    return Err(MnemonicErrors.UnableToDecrypt)
  }
  return Ok(mnemonic)
}
