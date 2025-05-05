import { AnyBalanceModule, defaultBalanceModules, Hydrate } from "@talismn/balances"
import { ChainId, TokenId } from "@talismn/chaindata-provider"
import { CoinsApiConfig, DEFAULT_COINSAPI_CONFIG } from "@talismn/token-rates"
import { atom } from "jotai"

export const balanceModuleCreatorsAtom =
  atom<Array<(hydrate: Hydrate) => AnyBalanceModule>>(defaultBalanceModules)

export const onfinalityApiKeyAtom = atom<string | undefined>(undefined)

const innerCoinsApiConfigAtom = atom<CoinsApiConfig>(DEFAULT_COINSAPI_CONFIG)
export const coinsApiConfigAtom = atom<CoinsApiConfig, [Partial<CoinsApiConfig>], void>(
  (get) => get(innerCoinsApiConfigAtom),
  (_get, set, options) =>
    set(innerCoinsApiConfigAtom, {
      apiUrl: options.apiUrl ?? DEFAULT_COINSAPI_CONFIG.apiUrl,
    }),
)

export const enableTestnetsAtom = atom<boolean>(false)

export const enabledChainsAtom = atom<ChainId[] | undefined>(undefined)
export const enabledTokensAtom = atom<TokenId[] | undefined>(undefined)
