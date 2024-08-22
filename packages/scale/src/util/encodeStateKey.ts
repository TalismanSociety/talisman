import { getDynamicBuilder } from "@polkadot-api/metadata-builders"

import log from "../log"

type ScaleStorageCoder = ReturnType<ReturnType<typeof getDynamicBuilder>["buildStorage"]>

export const encodeStateKey = (
  scaleCoder: ScaleStorageCoder | undefined,
  error?: string,
  ...args: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
): string | undefined => {
  try {
    return scaleCoder?.enc(...args)
  } catch (cause) {
    log.warn(error ?? `Failed to encode stateKey ${JSON.stringify(args)}`, cause)
    return
  }
}
