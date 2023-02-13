import { API_KEY_ONFINALITY } from "@core/constants"

export const getRpcUrlWithApiKey = (rpcUrl: string) => {
  if (!API_KEY_ONFINALITY) return rpcUrl
  // inject api key before using an rpc url because we don't want them in the store (user can modify urls of rpcs)
  return rpcUrl
    .replace(
      /^https:\/\/([A-z-]+)\.api\.onfinality\.io\/public-ws\/?$/,
      `https://$1.api.onfinality.io/ws?apikey=${API_KEY_ONFINALITY}`
    )
    .replace(
      /^https:\/\/([A-z-]+)\.api\.onfinality\.io\/rpc\/?$/,
      `https://$1.api.onfinality.io/rpc?apikey=${API_KEY_ONFINALITY}`
    )
}
