import { DotNetworkId, TokenId } from "@talismn/chaindata-provider"
import { CoinsApiConfig, DEFAULT_COINSAPI_CONFIG } from "@talismn/token-rates"
import { atom } from "jotai"

const innerCoinsApiConfigAtom = atom<CoinsApiConfig>(DEFAULT_COINSAPI_CONFIG)
export const coinsApiConfigAtom = atom<CoinsApiConfig, [Partial<CoinsApiConfig>], void>(
  (get) => get(innerCoinsApiConfigAtom),
  (_get, set, options) =>
    set(innerCoinsApiConfigAtom, {
      apiUrl: options.apiUrl ?? DEFAULT_COINSAPI_CONFIG.apiUrl,
    }),
)

export const enableTestnetsAtom = atom<boolean>(false)

export const enabledChainsAtom = atom<DotNetworkId[] | undefined>(undefined)
export const enabledTokensAtom = atom<TokenId[] | undefined>(undefined)
