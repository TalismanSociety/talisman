import { Twox128 } from "@polkadot-api/substrate-bindings"
import { toHex } from "@polkadot-api/utils"

export const getStorageKeyPrefix = (palletName: string, storageName: string) => {
  const palletHash = Twox128(new TextEncoder().encode(palletName))
  const storageHash = Twox128(new TextEncoder().encode(storageName))

  // Concatenate and convert to hex
  const combined = new Uint8Array(palletHash.length + storageHash.length)
  combined.set(palletHash, 0)
  combined.set(storageHash, palletHash.length)

  return toHex(combined)
}
