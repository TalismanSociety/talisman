import { DotNetwork, Network, NetworkList, Token, TokenList } from "@talismn/chaindata-provider"
import { firstThenDebounce } from "@talismn/util"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import { keyBy } from "lodash-es"
import { combineLatest } from "rxjs"

import { chaindataProviderAtom } from "./chaindataProvider"
import { enabledChainsAtom, enabledTokensAtom, enableTestnetsAtom } from "./config"

export const chaindataAtom = atomWithObservable((get) => {
  return combineLatest({
    networks: get(chaindataProviderAtom).networks$,
    tokens: get(chaindataProviderAtom).tokens$,
  }).pipe(firstThenDebounce(1_000))
})

const filteredChaindataAtom = atom(async (get) => {
  const enabledNetworkIds = get(enabledChainsAtom)
  const enabledTokenIds = get(enabledTokensAtom)
  const enableTestnets = get(enableTestnetsAtom)

  const chaindata = await get(chaindataAtom)
  const networks = chaindata.networks.filter(
    (n) => (enabledNetworkIds?.includes(n.id) || n.isDefault) && (enableTestnets || !n.isTestnet),
  )
  const networksById = keyBy(networks, (n) => n.id)
  const dotNetworksByGenesisHash = keyBy(
    networks.filter((n) => n.platform === "polkadot"),
    (n) => n.genesisHash,
  )

  const tokens = chaindata.tokens.filter(
    (token) =>
      (enabledTokenIds?.includes(token.id) || token.isDefault) && networksById[token.networkId],
  )
  const tokensById = keyBy(tokens, (t) => t.id)

  return { networks, networksById, dotNetworksByGenesisHash, tokens, tokensById }
})

export const networksAtom = atom<Promise<Network[]>>(
  async (get) => (await get(filteredChaindataAtom)).networks,
)
export const networksByIdAtom = atom<Promise<NetworkList>>(
  async (get) => (await get(filteredChaindataAtom)).networksById,
)
export const dotNetworksByGenesisHashAtom = atom<Promise<Record<string, DotNetwork>>>(
  async (get) => (await get(filteredChaindataAtom)).dotNetworksByGenesisHash,
)

export const tokensAtom = atom<Promise<Token[]>>(
  async (get) => (await get(filteredChaindataAtom)).tokens,
)
export const tokensByIdAtom = atom<Promise<TokenList>>(
  async (get) => (await get(filteredChaindataAtom)).tokensById,
)
