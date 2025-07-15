import { Address, BalanceJson, Balances, HydrateDb } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { fromPairs, keyBy } from "lodash-es"

import { allAddressesAtom } from "./allAddresses"
import { balancesProviderAtom } from "./balancesProvider"
import { chaindataAtom, tokensAtom } from "./chaindata"
import { tokenRatesAtom } from "./tokenRates"

const addressesByTokenIdAtom = atom(async (get): Promise<Record<TokenId, Address[]>> => {
  const [tokens, addresses] = await Promise.all([get(tokensAtom), get(allAddressesAtom)])

  return fromPairs(tokens.map((token) => [token.id, addresses]))
})

const rawBalancesAtom = atom<BalanceJson[]>([])

const subscribeBalancesAtom = atomEffect((get, set) => {
  const unsub = (async () => {
    const balancesProvider = get(balancesProviderAtom)
    const addressesByTokenId = await get(addressesByTokenIdAtom)
    const sub = balancesProvider.getBalances$(addressesByTokenId).subscribe((balances) => {
      set(rawBalancesAtom, balances.balances)
    })

    return () => {
      return sub.unsubscribe()
    }
  })()

  return () => {
    unsub.then((unsubscribe) => unsubscribe())
  }
})

const balancesHydrateDataAtom = atom(async (get): Promise<HydrateDb> => {
  const [chaindata, tokenRates] = await Promise.all([get(chaindataAtom), get(tokenRatesAtom)])

  const networksById = keyBy(chaindata.networks, "id")
  const tokensById = keyBy(chaindata.tokens, "id")

  return { networks: networksById, tokens: tokensById, tokenRates }
})

export const balancesAtom = atom(async (get): Promise<Balances> => {
  // subscribe to balancesProvider getBalance with addressesByTokenIdAtom as param
  get(subscribeBalancesAtom)

  const hydrate = await get(balancesHydrateDataAtom)
  const rawBalances = get(rawBalancesAtom)

  return new Balances(rawBalances, hydrate)
})
