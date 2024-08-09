import keyring from "@polkadot/ui-keyring"
import { DEBUG } from "extension-shared"
import groupBy from "lodash/groupBy"
import { type Properties } from "posthog-js"

import { db } from "../db"
import { AccountType } from "../domains/accounts/types"
import { appStore } from "../domains/app/store.app"
import { settingsStore } from "../domains/app/store.settings"
import { balancePool } from "../domains/balances/pool"
import { Balances } from "../domains/balances/types"
import { getNftCollectionFloorUsd } from "../domains/nfts"
import { nftsStore$ } from "../domains/nfts/store"
import { chaindataProvider } from "../rpcs/chaindata"
import { hasGhostsOfThePast } from "../util/hasGhostsOfThePast"
import { privacyRoundCurrency } from "../util/privacyRoundCurrency"

const REPORTING_PERIOD = 24 * 3600 * 1000 // 24 hours

//
// This should get sent at most once per 24 hours, whenever any other events get sent
//
export async function withGeneralReport(properties?: Properties) {
  const analyticsReportSent = await appStore.get("analyticsReportSent")

  // on first run, note down the timestamp but don't make a report
  if (typeof analyticsReportSent !== "number") {
    await appStore.set({ analyticsReportSent: Date.now() })
    return properties
  }

  // on subsequent runs, do nothing if the diff between the recorded timestamp and now is less than REPORTING_PERIOD
  if (Date.now() - analyticsReportSent < REPORTING_PERIOD) return properties

  // and when the diff is greater, make a report
  try {
    const generalReport = await getGeneralReport()

    // don't include general report if user is onboarding/has analytics turned off/other short-circuit conditions
    if (generalReport === undefined) return properties

    await appStore.set({ analyticsReportSent: Date.now() })
    return { ...properties, $set: { ...(properties?.$set ?? {}), ...generalReport } }
  } catch (cause) {
    console.warn("Failed to build general report", { cause }) // eslint-disable-line no-console
    return properties
  }
}

async function getGeneralReport() {
  const [allowTracking, onboarded] = await Promise.all([
    settingsStore.get("useAnalyticsTracking"),
    appStore.getIsOnboarded(),
  ])
  if (!allowTracking || !onboarded) return

  //
  // accounts
  //

  const accounts = keyring.getAccounts()

  const ownedAccounts = accounts.filter(({ meta }) => meta.origin !== AccountType.Watched)
  const ownedAccountsCount = ownedAccounts.length
  const ownedAddresses = ownedAccounts.map((account) => account.address)
  const ownedAddressesLower = ownedAddresses.map((a) => a.toLowerCase())

  const watchedAccounts = accounts.filter(({ meta }) => meta.origin === AccountType.Watched)
  const watchedAccountsCount = watchedAccounts.length

  const poolStatus = await Promise.race([
    balancePool.status,
    new Promise<"initialising">((resolve) => setTimeout(() => resolve("initialising"), 2_000)),
  ])
  // NOTE: There are two not-ready states of the balances pool, which are both called `initialising`.
  //   1. The pool is still getting chainata ready so that it can set up balances subscriptions.
  //   2. The pool is ready and has subscriptions, but some balances are still being refreshed from the chains.
  //
  // if balancePool isn't initialised (chaindata loaded from db), balances stats may be incorrect (initialising state 1)
  if (balancePool.hasInitialised.isPending()) return
  // if balancePool isn't initialised (all balance queries set to `live`), balances stats may be incorrect (initialising state 2)
  if (poolStatus === "initialising") return

  // if the balancePool has cached balances, we probably have an incomplete state of the user's balances
  // (i.e. we're still fetching them after a browser restart)
  //
  // 30 seconds after the pool is initialised, all of the cached balances are transformed into stale balances
  //
  // in the future, we should expose an observable on the pool which can indicate whether or not the pool is hydrated,
  // until then, this is a good-enough workaround
  const balanceJsons = Object.values(balancePool.balances).filter((balance) =>
    ownedAddresses.includes(balance.address)
  )
  if (balanceJsons.some((b) => b.status === "cache")) return

  // account type breakdown
  const accountBreakdown: Record<Lowercase<AccountType>, number> = {
    talisman: 0,
    qr: 0,
    ledger: 0,
    dcent: 0,
    watched: 0,
    signet: 0,
  }
  for (const account of accounts) {
    const origin = account.meta.origin as AccountType | undefined
    const type = origin?.toLowerCase?.() as Lowercase<AccountType> | undefined
    if (type) accountBreakdown[type] = (accountBreakdown[type] ?? 0) + 1
  }

  //
  // tokens
  //

  // cache chains, evmNetworks, tokens, tokenRates and balances here to prevent lots of fetch calls
  try {
    /* eslint-disable-next-line no-var */
    var [chains, evmNetworks, tokens, tokenRates] = await Promise.all([
      chaindataProvider.chainsById(),
      chaindataProvider.evmNetworksById(),
      chaindataProvider.tokensById(),
      db.tokenRates
        .toArray()
        .then((dbTokenRates) =>
          Object.fromEntries((dbTokenRates ?? []).map(({ tokenId, rates }) => [tokenId, rates]))
        ),
    ])

    /* eslint-disable-next-line no-var */
    var balances = new Balances(balanceJsons, { chains, evmNetworks, tokens, tokenRates })
  } catch (cause) {
    const error = new Error("Failed to access db to build general analyics report", { cause })
    DEBUG && console.error(error) // eslint-disable-line no-console
    throw error
  }

  // balances top 10 tokens/networks
  const TOP_BALANCES_COUNT = 10
  // get balance list per chain/evmNetwork and token
  const balancesPerChainToken = groupBy(
    balances.each.filter(
      (balance) =>
        balance &&
        (balance.chain === null || !("isCustom" in balance.chain && balance.chain.isCustom)) &&
        (balance.token === null || !("isCustom" in balance.token && balance.token.isCustom))
    ),
    (balance) => `${balance.chainId ?? balance.evmNetworkId}-${balance.tokenId}`
  )

  // get fiat sum object for those arrays of balances
  const sortedFiatSumPerChainToken = Object.values(balancesPerChainToken)
    .map((balances) => new Balances(balances, { chains, evmNetworks, tokens, tokenRates }))
    .map((balances) => ({
      balance: balances.sum.fiat("usd").total,
      chainId: balances.sorted[0].chainId ?? balances.sorted[0].evmNetworkId,
      tokenId: balances.sorted[0].tokenId,
    }))
    .sort((a, b) => b.balance - a.balance)

  const totalFiatValue = privacyRoundCurrency(balances.sum.fiat("usd").total)
  const tokensBreakdown = sortedFiatSumPerChainToken
    .filter((token, index) => token.balance > 1 || index < TOP_BALANCES_COUNT)
    .map((token) => ({ ...token, balance: privacyRoundCurrency(token.balance) }))

  const topChainTokens = sortedFiatSumPerChainToken
    .filter(({ balance }) => balance > 0)
    .map(({ chainId, tokenId }) => ({ chainId, tokenId }))
    .slice(0, 5)

  const topToken = topChainTokens[0]
    ? `${topChainTokens[0].chainId}: ${topChainTokens[0].tokenId}`
    : undefined

  //
  // nfts
  //

  const hasGhosts = await hasGhostsOfThePast()
  const hasGhostsNft = Object.values(hasGhosts).some((g) => g)

  const ownedNfts = nftsStore$.value.nfts.filter((nft) =>
    nft.owners.some((o) => ownedAddressesLower.includes(o.address.toLowerCase()))
  )
  const ownedCollections = nftsStore$.value.collections.filter((c) =>
    ownedNfts.some((n) => n.collectionId === c.id)
  )

  const nftsCount = ownedNfts.length
  const floorByCollectionId = Object.fromEntries(
    ownedCollections
      .map((collection) => [collection.id, getNftCollectionFloorUsd(collection)] as const)
      .filter(([, floor]) => !!floor)
  )
  const nftsTotalValue = ownedNfts.reduce(
    (total, nft) => total + (floorByCollectionId[nft.collectionId] ?? 0),
    0
  )
  const topNftCollections = Object.entries(floorByCollectionId)
    .sort((c1, c2) => (c2[1] ?? 0) - (c1[1] ?? 0))
    .slice(0, 20)
    .map(([collectionId]) => ownedCollections.find((c) => c.id === collectionId)?.name)

  return {
    // accounts
    accountBreakdown,
    accountsCount: ownedAccountsCount,
    watchedAccountsCount,

    // tokens
    totalFiatValue,
    tokens: tokensBreakdown,
    topChainTokens,
    topToken,

    // nfts
    nftsCount,
    nftsTotalValue,
    topNftCollections,
    hasGhostsOfThePast: hasGhostsNft,

    // util
    lastGeneralReport: Math.trunc(Date.now() / 1000),
  }
}
