import log from "../log"
import type { MetadataBuilder } from "../papito"

export type ScaleStorageCoder = ReturnType<MetadataBuilder["buildStorage"]>

export const encodeStateKey = (
  scaleCoder: ScaleStorageCoder | undefined,
  error?: string,
  ...args: unknown[]
): `0x${string}` | undefined => {
  try {
    return scaleCoder?.keys?.enc(...args) as `0x${string}`
  } catch (cause) {
    log.warn(error ?? `Failed to encode stateKey ${JSON.stringify(args)}`, cause)
    return
  }
}
