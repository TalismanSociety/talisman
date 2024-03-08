import merge from "lodash/merge"
import urlJoin from "url-join"

import { remoteConfigStore } from "../../domains/app/store.remoteConfig"

export const fetchFromCoingecko = async (relativeUrl: string, init: RequestInit = {}) => {
  const coingecko = await remoteConfigStore.get("coingecko")

  const headers =
    coingecko.apiKeyName && coingecko.apiKeyValue
      ? {
          [coingecko.apiKeyName]: coingecko.apiKeyValue,
        }
      : {}
  const enhancedInit = merge(init, { headers })

  return fetch(urlJoin(coingecko.apiUrl, relativeUrl), enhancedInit)
}
