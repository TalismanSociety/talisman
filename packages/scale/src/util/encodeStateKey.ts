import log from "../log"
import { MetadataBuilder } from "../papito"

export type ScaleStorageCoder = ReturnType<MetadataBuilder["buildStorage"]>

export const encodeStateKey = (
  scaleCoder: ScaleStorageCoder | undefined,
  error?: string,
  ...args: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
): `0x${string}` | undefined => {
  try {
    return scaleCoder?.keys?.enc(...args) as `0x${string}`
  } catch (cause) {
    log.warn(error ?? `Failed to encode stateKey ${JSON.stringify(args)}`, cause)
    return
  }
}
