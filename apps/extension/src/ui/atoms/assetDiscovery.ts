import { db } from "@core/db"
import { AssetDiscoveryScanState, assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { DiscoveredBalance } from "@core/domains/assetDiscovery/types"
import { log } from "@core/log"
import { Address } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { liveQuery } from "dexie"
import groupBy from "lodash/groupBy"
import sortBy from "lodash/sortBy"
import { atom, selector } from "recoil"
import { debounceTime, first, from, merge } from "rxjs"

import { tokensMapQuery } from "./chaindata"

const assetDiscoveryBalancesState = atom<DiscoveredBalance[]>({
  key: "assetDiscoveryBalancesState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      log.debug("assetDiscoveryBalancesState.init")
      const obs = from(liveQuery(() => db.assetDiscovery.toArray()))

      // backend will do a lot of updates
      // debounce to mitigate performance issues
      // also, we only need the first value to hydrate the atom
      const sub = merge(obs.pipe(first()), obs.pipe(debounceTime(500))).subscribe(setSelf)

      return () => sub.unsubscribe()
    },
  ],
})

export const assetDiscoveryScanState = atom<AssetDiscoveryScanState>({
  key: "assetDiscoveryScanState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      log.debug("assetDiscoveryScanState.init")
      const sub = assetDiscoveryStore.observable.subscribe(setSelf)

      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

export const assetDiscoveryScanProgress = selector<{
  percent: number
  balances: DiscoveredBalance[]
  balancesByTokenId: Record<TokenId, DiscoveredBalance[]>
  tokensCount: number
  accounts: Address[]
  accountsCount: number
  isInProgress: boolean
  tokenIds: TokenId[]
}>({
  key: "scanProgress",
  get: ({ get }) => {
    const {
      currentScanId,
      currentScanProgressPercent: percent,
      currentScanAccounts,
      currentScanTokensCount,
      lastScanAccounts,
      lastScanTokensCount,
    } = get(assetDiscoveryScanState)
    const tokensMap = get(tokensMapQuery({ activeOnly: false, includeTestnets: true }))
    const balances = get(assetDiscoveryBalancesState)
    const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
    const tokenIds = sortBy(
      Object.keys(balancesByTokenId),
      (tokenId) => Number(tokensMap[tokenId].evmNetwork?.id ?? 0),
      (tokenId) => tokensMap[tokenId]?.symbol
    )

    const isInProgress = !!currentScanId
    const accounts = isInProgress ? currentScanAccounts : lastScanAccounts
    const tokensCount = isInProgress ? currentScanTokensCount : lastScanTokensCount

    return {
      isInProgress,
      percent,
      balances,
      balancesByTokenId,
      tokensCount,
      accounts,
      accountsCount: accounts.length,
      tokenIds,
    }
  },
})
