import log from "../log"
import { MetadataBuilder } from "../papito"

type ScaleStorageCoder = ReturnType<MetadataBuilder["buildStorage"]>

export const decodeScale = <T>(
  scaleCoder: ScaleStorageCoder | undefined,
  change: string | null,
  error?: string,
): T | null => {
  if (change === null) return null

  try {
    return (scaleCoder?.value?.dec(change) as T | undefined) ?? null
  } catch (cause) {
    log.warn(error ?? `Failed to decode ${change}`, cause)
    return null
  }
}
