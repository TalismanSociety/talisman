import { db } from "@core/db"
import { assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { bind } from "@react-rxjs/core"
import { liveQuery } from "dexie"
import groupBy from "lodash-es/groupBy"
import isEqual from "lodash-es/isEqual"
import sortBy from "lodash-es/sortBy"
import { combineLatest, distinctUntilChanged, from, map, shareReplay, throttleTime } from "rxjs"

import { getTokensMap$ } from "./chaindata"

// debounced to prevent hammering coingecko api
const assetDiscoveryBalances$ = from(liveQuery(() => db.assetDiscovery.toArray())).pipe(
  throttleTime(500, undefined, { leading: true, trailing: true }),
  shareReplay(1)
)

const assetDiscoveryScan$ = assetDiscoveryStore.observable.pipe(
  throttleTime(500, undefined, { leading: true, trailing: true })
)

export const [useAssetDiscoveryScan] = bind(assetDiscoveryScan$)

// The store's hot fields (cursors, progress) are rewritten throughout a scan, while
// the aggregation of discovered balances is the expensive part of this stream — so
// the two are split: scan meta re-emits only when the fields the UI displays
// actually change, and the aggregation below recomputes only when the discovered
// balances or the tokens map change, never on a progress tick.
const assetDiscoveryScanMeta$ = assetDiscoveryScan$.pipe(
  map(
    ({
      currentScanScope,
      currentScanProgressPercent,
      currentScanTokensCount,
      lastScanAccounts,
      lastScanNetworks,
      lastScanTokensCount,
    }) => ({
      currentScanScope,
      currentScanProgressPercent,
      currentScanTokensCount,
      lastScanAccounts,
      lastScanNetworks,
      lastScanTokensCount,
    })
  ),
  distinctUntilChanged(isEqual)
)

const discoveredBalancesAggregate$ = combineLatest([
  assetDiscoveryBalances$,
  getTokensMap$({ activeOnly: false, includeTestnets: true }),
]).pipe(
  map(([balances, tokensMap]) => {
    const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
    const tokenIds = sortBy(
      Object.keys(balancesByTokenId).filter((id) => !!tokensMap[id]), // some tokens may have been deleted since the scan finished
      (tokenId) => Number(tokensMap[tokenId]?.networkId ?? 0),
      (tokenId) => tokensMap[tokenId]?.symbol
    )
    return { balances, balancesByTokenId, tokenIds }
  }),
  shareReplay(1)
)

export const [useAssetDiscoveryScanProgress, assetDiscoveryScanProgress$] = bind(
  combineLatest([assetDiscoveryScanMeta$, discoveredBalancesAggregate$]).pipe(
    map(([scan, { balances, balancesByTokenId, tokenIds }]) => {
      const {
        currentScanScope,
        currentScanProgressPercent: percent,
        currentScanTokensCount,
        lastScanAccounts,
        lastScanNetworks,
        lastScanTokensCount,
      } = scan

      const isInProgress = !!currentScanScope

      const accounts = isInProgress ? currentScanScope.addresses : lastScanAccounts
      const tokensCount = isInProgress ? currentScanTokensCount : lastScanTokensCount
      const networksCount = isInProgress
        ? currentScanScope?.networkIds.length
        : lastScanNetworks.length

      return {
        isInProgress,
        percent,
        balances,
        balancesByTokenId,
        tokensCount,
        accounts,
        accountsCount: accounts.length,
        networksCount,
        tokenIds,
      }
    })
  )
)
