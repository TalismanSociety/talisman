import { DEBUG } from "extension-shared"
import urlJoin from "url-join"

import { remoteConfig$ } from "@ui/state"

// should only be used when debugging, it allows simulating being in another country
const DEBUG_IP = "8.8.8.8" // null

export const getRampApiUrl = async (path: string) => {
  const remoreConfig = await remoteConfig$.getValue()
  const baseApiUrl = remoreConfig.rampConfig.rampApiBasePath

  const url = new URL(urlJoin(baseApiUrl, path))

  const userIp = DEBUG && DEBUG_IP
  if (userIp) url.searchParams.set("userIp", userIp)

  return url.toString()
}
