import type { DotNetworkId } from "@talismn/chaindata-provider"

type Connector = {
  send(networkId: DotNetworkId, method: string, params: unknown[]): Promise<unknown>
}

export type StorageReadOptions = {
  /** block to read from, so a multi-call read stays on one block */
  at?: `0x${string}`
  signal?: AbortSignal
}

const KEYS_PAGE_SIZE = 1000
const VALUES_CHUNK_SIZE = 500

type StorageChangeSet = { block: string; changes: [key: string, value: `0x${string}` | null][] }

/**
 * Prefix scan via state_getKeysPaged. The unpaged state_getKeys is classified as heavy storage
 * work and rejected by some public nodes (eg the bittensor testnet one: "Storage work rate limit
 * exceeded"), while the paged variant is universally allowed.
 */
export const fetchStorageKeysPaged = async (
  connector: Connector,
  networkId: DotNetworkId,
  keyPrefix: string,
  { at, signal }: StorageReadOptions = {}
): Promise<`0x${string}`[]> => {
  const keys: `0x${string}`[] = []
  let startKey: `0x${string}` | undefined
  do {
    signal?.throwIfAborted()
    const params: unknown[] = [keyPrefix, KEYS_PAGE_SIZE]
    if (startKey || at) params.push(startKey ?? null)
    if (at) params.push(at)

    const page = (await connector.send(networkId, "state_getKeysPaged", params)) as `0x${string}`[]
    keys.push(...page)
    startKey = page.length === KEYS_PAGE_SIZE ? page[page.length - 1] : undefined
  } while (startKey)
  return keys
}

/** Reads storage values in chunks of 500 keys per state_queryStorageAt call */
export const queryStorageAt = async (
  connector: Connector,
  networkId: DotNetworkId,
  storageKeys: string[],
  { at, signal }: StorageReadOptions = {}
): Promise<Map<string, `0x${string}` | null>> => {
  const values = new Map<string, `0x${string}` | null>()
  for (let start = 0; start < storageKeys.length; start += VALUES_CHUNK_SIZE) {
    signal?.throwIfAborted()
    const chunk = storageKeys.slice(start, start + VALUES_CHUNK_SIZE)
    const [changeSet] = (await connector.send(
      networkId,
      "state_queryStorageAt",
      at ? [chunk, at] : [chunk]
    )) as StorageChangeSet[]
    if (!Array.isArray(changeSet?.changes))
      throw new Error("Unexpected state_queryStorageAt response shape")
    for (const [key, value] of changeSet.changes) values.set(key, value)
  }
  return values
}
