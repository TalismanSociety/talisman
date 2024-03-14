import { assetDiscoveryStore, db } from "@extension/core"
import { firstThenDebounce } from "@talismn/util"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import groupBy from "lodash/groupBy"
import sortBy from "lodash/sortBy"
import { from } from "rxjs"

import { tokensMapAtomFamily } from "./chaindata"
import { logObservableUpdate } from "./utils/logObservableUpdate"

const assetDiscoveryBalancesAtom = atomWithObservable(() =>
  // backend will do a lot of updates
  // debounce to mitigate performance issues
  from(liveQuery(() => db.assetDiscovery.toArray()))
    .pipe(firstThenDebounce(500))
    .pipe(logObservableUpdate("assetDiscoveryBalancesAtom"))
)

export const assetDiscoveryScanAtom = atomWithObservable(() =>
  assetDiscoveryStore.observable.pipe(logObservableUpdate("assetDiscoveryScanAtom"))
)

export const assetDiscoveryScanProgressAtom = atom(async (get) => {
  const {
    currentScanId,
    currentScanProgressPercent: percent,
    currentScanAccounts,
    currentScanTokensCount,
    lastScanAccounts,
    lastScanTokensCount,
  } = await get(assetDiscoveryScanAtom)
  const tokensMap = await get(tokensMapAtomFamily({ activeOnly: false, includeTestnets: true }))
  const balances = await get(assetDiscoveryBalancesAtom)
  const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
  const tokenIds = sortBy(
    Object.keys(balancesByTokenId).filter((id) => !!tokensMap[id]), // some tokens may have been deleted since the scan finished
    (tokenId) => Number(tokensMap[tokenId]?.evmNetwork?.id ?? 0),
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
})
