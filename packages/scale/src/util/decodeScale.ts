import { getDynamicBuilder } from "@polkadot-api/metadata-builders"

import log from "../log"

type ScaleStorageCoder = ReturnType<ReturnType<typeof getDynamicBuilder>["buildStorage"]>

export const decodeScale = <T>(
  scaleCoder: ScaleStorageCoder | undefined,
  change: string | null,
  error?: string,
): T | null => {
  if (change === null) return null

  try {
    return (scaleCoder?.dec(change) as T | undefined) ?? null
  } catch (cause) {
    log.warn(error ?? `Failed to decode ${change}`, cause)
    return null
  }
}
