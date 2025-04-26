import { RAMPS_RAMP_API_BASE_PATH } from "extension-shared"
import urlJoin from "url-join"

import { remoteConfig$ } from "@ui/state"

export const getRampApiUrl = async (path: string) => {
  const remoreConfig = await remoteConfig$.getValue()

  const url = new URL(urlJoin(RAMPS_RAMP_API_BASE_PATH, path))

  url.searchParams.set("hostApiKey", remoreConfig.ramps.rampApiKey)

  return url.toString()
}
