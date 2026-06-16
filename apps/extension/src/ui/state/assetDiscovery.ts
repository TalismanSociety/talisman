import { db } from "@core/db"
import { assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { bind } from "@react-rxjs/core"
import { liveQuery } from "dexie"
import groupBy from "lodash-es/groupBy"
import sortBy from "lodash-es/sortBy"
import { combineLatest, from, map, shareReplay, throttleTime } from "rxjs"

import { getTokensMap$ } from "./chaindata"

// debounced to prevent hammering coingecko api
const assetDiscoveryBalances$ = from(liveQuery(() => db.assetDiscovery.toArray())).pipe(
  throttleTime(500, undefined, { leading: true, trailing: true }),
  shareReplay(1)
)

const assetDiscoveryScan$ = assetDiscoveryStore.observable.pipe(
  throttleTime(100, undefined, { leading: true, trailing: true })
)

export const [useAssetDiscoveryScan] = bind(assetDiscoveryScan$)

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
        (tokenId) => Number(tokensMap[tokenId]?.networkId ?? 0),
        (tokenId) => tokensMap[tokenId]?.symbol
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
    })
  )
)
