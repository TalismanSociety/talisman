import { Chain } from "./types"

export const isApiAvailable = (chain: Chain, name: string, method: string) => {
  return chain.metadata.apis.some(
    (a) => a.name === name && a.methods.some((m) => m.name === method),
  )
}
