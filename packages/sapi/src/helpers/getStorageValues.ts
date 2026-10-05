import { getSendRequestResult } from "./getSendRequestResult"
import type { Chain } from "./types"

type StorageChangeSet = { block: string; changes: [key: string, value: string | null][] }

export const getStorageValues = async <T>(
  chain: Chain,
  pallet: string,
  entry: string,
  keysList: unknown[][],
  at?: string
): Promise<(T | null)[]> => {
  if (!keysList.length) return []

  const storageCodec = chain.builder.buildStorage(pallet, entry)
  const stateKeys = keysList.map((keys) => storageCodec.keys.enc(...keys))

  const [changeSet] = await getSendRequestResult<StorageChangeSet[]>(
    chain,
    "state_queryStorageAt",
    [stateKeys, at]
  )
  const hexValueByKey = new Map(changeSet?.changes)

  return stateKeys.map((stateKey) => {
    const hexValue = hexValueByKey.get(stateKey)
    return typeof hexValue === "string" ? (storageCodec.value.dec(hexValue) as T) : null
  })
}
