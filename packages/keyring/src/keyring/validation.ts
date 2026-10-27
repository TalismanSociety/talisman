import { type KeypairCurve, normalizeAddress } from "@talismn/crypto"

import type { AccountType, LedgerPolkadotCurve } from "../types"
import type { AccountStorage, MnemonicStorage } from "./types"

type StoredKeyring = {
  passwordCheck: string | null
  mnemonics: MnemonicStorage[]
  accounts: AccountStorage[]
}

const ACCOUNT_TYPES: readonly AccountType[] = [
  "keypair",
  "contact",
  "watch-only",
  "ledger-ethereum",
  "ledger-polkadot",
  "ledger-solana",
  "polkadot-vault",
  "signet",
]

const KEYPAIR_CURVES: readonly KeypairCurve[] = [
  "ecdsa",
  "ed25519",
  "sr25519",
  "ethereum",
  "bitcoin-ed25519",
  "bitcoin-ecdsa",
  "solana",
]

const LEDGER_POLKADOT_CURVES: readonly LedgerPolkadotCurve[] = ["ed25519", "ethereum"]

/** Fields that only keypair accounts carry. */
const KEYPAIR_ONLY_FIELDS = ["secretKey", "mnemonicId"] as const

const REGEX_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Output of encryptData: base64 of a 16 byte salt, a 12 byte IV and the AES-GCM ciphertext. */
const isEncryptedData = (value: unknown): value is string =>
  typeof value === "string" && value.length % 4 === 0 && REGEX_BASE64.test(value)

const isOptional = <T>(value: unknown, check: (value: unknown) => value is T) =>
  value === undefined || check(value)

const isString = (value: unknown): value is string => typeof value === "string"
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean"
const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === "string"

function fail(reason: string): never {
  throw new Error(`Invalid keyring data: ${reason}`)
}

/**
 * Checks the structure of a keyring blob before Keyring.load() uses it.
 *
 * Mnemonics and keypair accounts are written only by this library, so every field it sets is
 * checked. The other account types also come from callers and from older versions, whose stored
 * records can lack fields their type declares (the polkadot.js keyring migration leaves out the
 * ones the old account did not have) or carry extra ones (the mobile app adds some). For those
 * only the type and the address are checked, so data that users already have keeps loading.
 *
 * Error messages name the failing field, never its value.
 */
export function assertKeyringStorage(data: unknown): asserts data is StoredKeyring {
  if (!isRecord(data)) fail("not an object")
  if (!isStringOrNull(data.passwordCheck)) fail("passwordCheck")
  if (data.passwordCheck !== null && !isEncryptedData(data.passwordCheck)) fail("passwordCheck")
  if (!Array.isArray(data.mnemonics)) fail("mnemonics")
  if (!Array.isArray(data.accounts)) fail("accounts")

  const mnemonicIds = new Set<string>()
  for (const [i, mnemonic] of (data.mnemonics as unknown[]).entries()) {
    const at = `mnemonics[${i}]`
    if (!isRecord(mnemonic)) fail(at)
    if (!isNonEmptyString(mnemonic.id)) fail(`${at}.id`)
    if (!isEncryptedData(mnemonic.entropy)) fail(`${at}.entropy`)
    if (!isString(mnemonic.name)) fail(`${at}.name`)
    if (!isBoolean(mnemonic.confirmed)) fail(`${at}.confirmed`)
    if (mnemonicIds.has(mnemonic.id)) fail(`${at}.id is a duplicate`)
    mnemonicIds.add(mnemonic.id)
  }

  // same comparison as Keyring.getAccount: addresses that cannot be normalised never match
  const addresses = new Set<string>()
  let hasSecrets = data.mnemonics.length > 0
  for (const [i, account] of (data.accounts as unknown[]).entries()) {
    const at = `accounts[${i}]`
    if (!isRecord(account)) fail(at)
    if (!ACCOUNT_TYPES.includes(account.type as AccountType)) fail(`${at}.type`)
    if (!isNonEmptyString(account.address)) fail(`${at}.address`)

    if (account.type === "keypair") {
      hasSecrets = true
      if (!KEYPAIR_CURVES.includes(account.curve as KeypairCurve)) fail(`${at}.curve`)
      if (!isEncryptedData(account.secretKey)) fail(`${at}.secretKey`)
      // a mnemonicId can point at a mnemonic that was removed: the account keeps its own secret
      if (!isOptional(account.mnemonicId, isNonEmptyString)) fail(`${at}.mnemonicId`)
      if (!isOptional(account.derivationPath, isString)) fail(`${at}.derivationPath`)
    } else {
      for (const field of KEYPAIR_ONLY_FIELDS)
        if (field in account) fail(`${at}.${field} on a ${account.type} account`)
    }

    if (
      account.type === "ledger-polkadot" &&
      !LEDGER_POLKADOT_CURVES.includes(account.curve as LedgerPolkadotCurve)
    )
      fail(`${at}.curve`)

    let normalised: string | null = null
    try {
      normalised = normalizeAddress(account.address)
    } catch {
      // not comparable, see above
    }
    if (normalised !== null) {
      if (addresses.has(normalised)) fail(`${at}.address is a duplicate`)
      addresses.add(normalised)
    }
  }

  // every method that stores a secret sets passwordCheck first
  if (hasSecrets && data.passwordCheck === null) fail("passwordCheck is missing")
}
