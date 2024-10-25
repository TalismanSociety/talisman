import { bind } from "@react-rxjs/core"
import { liveQuery } from "dexie"
import { assetDiscoveryStore, db, DiscoveredBalance } from "extension-core"
import groupBy from "lodash/groupBy"
import sortBy from "lodash/sortBy"
import { combineLatest, from, map, Observable, shareReplay, throttleTime } from "rxjs"

import { getTokensMap$ } from "./chaindata"
import { debugObservable } from "./util/debugObservable"

// TODO return dexie observable directly ?
export const assetDiscoveryBalances$ = new Observable<DiscoveredBalance[]>((subscriber) => {
  const sub = from(liveQuery(() => db.assetDiscovery.toArray()))
    .pipe(throttleTime(500, undefined, { leading: true, trailing: true }))
    .subscribe(subscriber)

  return () => sub.unsubscribe()
}).pipe(debugObservable("assetDiscoveryBalances$"), shareReplay(1))

export const [useAssetDiscoveryScan, assetDiscoveryScan$] = bind(assetDiscoveryStore.observable)

export const [useAssetDiscoveryScanProgress, assetDiscoveryScanProgress$] = bind(
  combineLatest([
    assetDiscoveryScan$,
    assetDiscoveryBalances$,
    getTokensMap$({ activeOnly: false, includeTestnets: true }),
  ]).pipe(
    map(([scan, balances, tokensMap]) => {
      const {
        currentScanId,
        currentScanProgressPercent: percent,
        currentScanAccounts,
        currentScanTokensCount,
        lastScanAccounts,
        lastScanTokensCount,
      } = scan

      const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
      const tokenIds = sortBy(
        Object.keys(balancesByTokenId).filter((id) => !!tokensMap[id]), // some tokens may have been deleted since the scan finished
        (tokenId) => Number(tokensMap[tokenId]?.evmNetwork?.id ?? 0),
        (tokenId) => tokensMap[tokenId]?.symbol,
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
    }),
    shareReplay(1),
  ),
)
