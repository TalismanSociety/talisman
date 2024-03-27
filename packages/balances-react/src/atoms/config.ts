import { AnyBalanceModule, Hydrate, defaultBalanceModules } from "@talismn/balances"
import { ChainId, TokenId } from "@talismn/chaindata-provider"
import { CoingeckoConfig, DEFAULT_COINGECKO_CONFIG } from "@talismn/token-rates"
import { atom } from "jotai"

export const balanceModuleCreatorsAtom =
  atom<Array<(hydrate: Hydrate) => AnyBalanceModule>>(defaultBalanceModules)

export const onfinalityApiKeyAtom = atom<string | undefined>(undefined)

const innerCoingeckoConfigAtom = atom<CoingeckoConfig>(DEFAULT_COINGECKO_CONFIG)
export const coingeckoConfigAtom = atom<CoingeckoConfig, [Partial<CoingeckoConfig>], void>(
  (get) => get(innerCoingeckoConfigAtom),
  (_get, set, options) => {
    const apiUrl = options.apiUrl ?? DEFAULT_COINGECKO_CONFIG.apiUrl
    const apiKeyName = options.apiKeyName ?? DEFAULT_COINGECKO_CONFIG.apiKeyName
    const apiKeyValue = options.apiKeyValue ?? DEFAULT_COINGECKO_CONFIG.apiKeyValue

    set(innerCoingeckoConfigAtom, { apiUrl, apiKeyName, apiKeyValue })
  }
)

export const enableTestnetsAtom = atom<boolean>(false)

export const enabledChainsAtom = atom<ChainId[] | undefined>(undefined)
export const enabledTokensAtom = atom<TokenId[] | undefined>(undefined)
