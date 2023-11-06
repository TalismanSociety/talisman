/**
 * Helper function to add our onfinality api key to a public onfinality RPC url.
 */
export const addOnfinalityApiKey = (rpcUrl: string, onfinalityApiKey?: string) => {
  if (typeof onfinalityApiKey !== "string" || !onfinalityApiKey) return rpcUrl

  // inject api key here because we don't want them in the store (user can modify urls of rpcs)
  return rpcUrl
    .replace(
      /^https:\/\/([A-z-]+)\.api\.onfinality\.io\/public-ws\/?$/,
      `https://$1.api.onfinality.io/ws?apikey=${onfinalityApiKey}`
    )
    .replace(
      /^https:\/\/([A-z-]+)\.api\.onfinality\.io\/rpc\/?$/,
      `https://$1.api.onfinality.io/rpc?apikey=${onfinalityApiKey}`
    )
}
