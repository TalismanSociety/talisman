import { db } from "@core/db"
import { assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { firstThenDebounce } from "@core/util/firstThenDebounce"
import { liveQuery } from "dexie"
import { atom } from "jotai"
import { atomWithObservable } from "jotai/utils"
import groupBy from "lodash/groupBy"
import sortBy from "lodash/sortBy"
import { from } from "rxjs"

import { tokensMapAtomFamily } from "./chaindata"

const assetDiscoveryBalancesAtom = atomWithObservable(() =>
  // backend will do a lot of updates
  // debounce to mitigate performance issues
  from(liveQuery(() => db.assetDiscovery.toArray())).pipe(firstThenDebounce(500))
)

export const assetDiscoveryScanAtom = atomWithObservable(() => assetDiscoveryStore.observable)

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
    Object.keys(balancesByTokenId),
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

// export const assetDiscoveryScanProgress = selector<{
//   percent: number
//   balances: DiscoveredBalance[]
//   balancesByTokenId: Record<TokenId, DiscoveredBalance[]>
//   tokensCount: number
//   accounts: Address[]
//   accountsCount: number
//   isInProgress: boolean
//   tokenIds: TokenId[]
// }>({
//   key: "scanProgress",
//   get: ({ get }) => {
//     const {
//       currentScanId,
//       currentScanProgressPercent: percent,
//       currentScanAccounts,
//       currentScanTokensCount,
//       lastScanAccounts,
//       lastScanTokensCount,
//     } = get(assetDiscoveryScanState)
//     const tokensMap = get(tokensMapQuery({ activeOnly: false, includeTestnets: true }))
//     const balances = get(assetDiscoveryBalancesState)
//     const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
//     const tokenIds = sortBy(
//       Object.keys(balancesByTokenId),
//       (tokenId) => Number(tokensMap[tokenId]?.evmNetwork?.id ?? 0),
//       (tokenId) => tokensMap[tokenId]?.symbol
//     )

//     const isInProgress = !!currentScanId
//     const accounts = isInProgress ? currentScanAccounts : lastScanAccounts
//     const tokensCount = isInProgress ? currentScanTokensCount : lastScanTokensCount

//     return {
//       isInProgress,
//       percent,
//       balances,
//       balancesByTokenId,
//       tokensCount,
//       accounts,
//       accountsCount: accounts.length,
//       tokenIds,
//     }
//   },
// })
