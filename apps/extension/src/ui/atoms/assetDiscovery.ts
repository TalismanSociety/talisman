import { db } from "@core/db"
import { AssetDiscoveryScanState, assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { DiscoveredBalance } from "@core/domains/assetDiscovery/types"
import { Address } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { liveQuery } from "dexie"
import { groupBy } from "lodash"
import { atom, selector } from "recoil"
import { debounceTime, first, from, merge } from "rxjs"

export const assetDiscoveryBalancesState = atom<DiscoveredBalance[]>({
  key: "assetDiscoveryBalancesState",
  effects: [
    // sync from db
    ({ setSelf }) => {
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
    const balances = get(assetDiscoveryBalancesState)
    const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
    const tokenIds = Object.keys(balancesByTokenId)

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
