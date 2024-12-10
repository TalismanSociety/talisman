import { bind } from "@react-rxjs/core"
import { liveQuery } from "dexie"
import { assetDiscoveryStore, db } from "extension-core"
import groupBy from "lodash/groupBy"
import sortBy from "lodash/sortBy"
import { combineLatest, from, map, shareReplay, throttleTime } from "rxjs"

import { getTokensMap$ } from "./chaindata"

// debounced to prevent hammering coingecko api
const assetDiscoveryBalances$ = from(liveQuery(() => db.assetDiscovery.toArray())).pipe(
  throttleTime(500, undefined, { leading: true, trailing: true }),
  shareReplay(1),
)

export const [useAssetDiscoveryScan, assetDiscoveryScan$] = bind(assetDiscoveryStore.observable)

export const [useAssetDiscoveryScanProgress, assetDiscoveryScanProgress$] = bind(
  combineLatest([
    assetDiscoveryScan$,
    assetDiscoveryBalances$,
    getTokensMap$({ activeOnly: false, includeTestnets: true }),
  ]).pipe(
    map(([scan, balances, tokensMap]) => {
      const {
        currentScanScope,
        currentScanProgressPercent: percent,
        currentScanTokensCount,
        lastScanAccounts,
        lastScanNetworks,
        lastScanTokensCount,
      } = scan

      const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
      const tokenIds = sortBy(
        Object.keys(balancesByTokenId).filter((id) => !!tokensMap[id]), // some tokens may have been deleted since the scan finished
        (tokenId) => Number(tokensMap[tokenId]?.evmNetwork?.id ?? 0),
        (tokenId) => tokensMap[tokenId]?.symbol,
      )

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
    }),
    shareReplay(1),
  ),
)
