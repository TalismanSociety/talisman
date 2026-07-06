/**
 * Access to the legacy polkadot-js keyring storage (pre @talismn/keyring versions).
 * Accounts were persisted by @polkadot/ui-keyring's AccountsStore as plain keystore
 * jsons in chrome.storage.local, keyed `account:0x<publicKey>`.
 */

export type LegacyPjsAccountJson = {
  address: string
  encoded: string
  encoding: { content: string | string[]; type: string | string[]; version: string }
  meta: Record<string, unknown>
}

const isLegacyPjsAccountJson = (value: unknown): value is LegacyPjsAccountJson =>
  !!value &&
  typeof value === "object" &&
  typeof (value as LegacyPjsAccountJson).address === "string" &&
  !!(value as LegacyPjsAccountJson).encoding

export const getLegacyPjsAccountEntries = async (): Promise<
  [key: string, json: LegacyPjsAccountJson][]
> => {
  const all = await chrome.storage.local.get(null)
  return Object.entries(all).filter(
    (entry): entry is [string, LegacyPjsAccountJson] =>
      entry[0].startsWith("account:0x") && isLegacyPjsAccountJson(entry[1])
  )
}

export const getLegacyPjsAccounts = async (): Promise<LegacyPjsAccountJson[]> =>
  (await getLegacyPjsAccountEntries()).map(([, json]) => json)

/** Persists a legacy pjs account json back to its storage slot (`account:0x<publicKey>`) */
export const saveLegacyPjsAccount = (key: string, json: LegacyPjsAccountJson): Promise<void> =>
  chrome.storage.local.set({ [key]: json })

/** pjs keypair type of a legacy account (same fallback as polkadot-js createFromJson) */
export const getLegacyPjsAccountType = (json: LegacyPjsAccountJson): string =>
  Array.isArray(json.encoding.content) ? json.encoding.content[1] : "ed25519"
