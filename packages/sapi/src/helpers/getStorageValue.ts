import { getSendRequestResult } from "./getSendRequestResult"
import { Chain } from "./types"

export const getStorageValue = async <T>(
  chain: Chain,
  pallet: string,
  entry: string,
  keys: unknown[],
  at?: string,
) => {
  const storageCodec = chain.builder.buildStorage(pallet, entry)
  const stateKey = storageCodec.keys.enc(...keys)

  const hexValue = await getSendRequestResult<string | null>(chain, "state_getStorage", [
    stateKey,
    at,
  ])
  if (!hexValue) return null as T // caller will need to expect null when applicable

  return storageCodec.value.dec(hexValue) as T
}
