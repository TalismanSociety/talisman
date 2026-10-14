import { queryStorageAt } from "../storageReads"
import type { Chain } from "./types"

export const getStorageValues = async <T>(
  chain: Chain,
  pallet: string,
  entry: string,
  keysList: unknown[][],
  at?: string
): Promise<(T | null)[]> => {
  const storageCodec = chain.builder.buildStorage(pallet, entry)
  const stateKeys = keysList.map((keys) => storageCodec.keys.enc(...keys))

  const hexValueByKey = await queryStorageAt(chain.connector.send, stateKeys, { at })

  return stateKeys.map((stateKey) => {
    const hexValue = hexValueByKey.get(stateKey)
    return typeof hexValue === "string" ? (storageCodec.value.dec(hexValue) as T) : null
  })
}
