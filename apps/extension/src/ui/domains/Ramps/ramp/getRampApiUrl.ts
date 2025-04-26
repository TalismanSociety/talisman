import urlJoin from "url-join"

import { remoteConfig$ } from "@ui/state"

export const getRampApiUrl = async (path: string) => {
  const remoreConfig = await remoteConfig$.getValue()
  const baseApiUrl = remoreConfig.rampConfig.rampApiBasePath

  const url = new URL(urlJoin(baseApiUrl, path))

  url.searchParams.set("hostApiKey", remoreConfig.rampConfig.rampApiKey)

  return url.toString()
}
