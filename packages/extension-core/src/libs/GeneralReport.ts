import { Account, isAccountOwned } from "@talismn/keyring"
import { sleep } from "@talismn/util"
import { DEBUG, IS_FIREFOX } from "extension-shared"
import groupBy from "lodash/groupBy"

import { sentry } from "../config/sentry"
import { db } from "../db"
import { LegacyAccountOrigin } from "../domains/accounts/types"
import { PostHogCaptureProperties } from "../domains/analytics/types"
import { appStore } from "../domains/app/store.app"
import { settingsStore } from "../domains/app/store.settings"
import { balancePool } from "../domains/balances/pool"
import { Balances } from "../domains/balances/types"
import { keyringStore } from "../domains/keyring/store"
import { getNftCollectionFloorUsd, subscribeNfts } from "../domains/nfts"
import { nftsStore$ } from "../domains/nfts/store"
import { chaindataProvider } from "../rpcs/chaindata"
import { hasGhostsOfThePast } from "../util/hasGhostsOfThePast"
import { privacyRoundCurrency } from "../util/privacyRoundCurrency"

const REPORTING_PERIOD = 24 * 3600 * 1000 // 24 hours

export type GeneralReport = Awaited<ReturnType<typeof getGeneralReport>>

/**
 * This global variable makes sure that we only build one report at a time.
 * If the background script is restarted, this flag will be reset to `false`.
 */
let isBuildingReport = false

//
// This should get sent at most once per 24 hours, whenever any other events get sent
//
export async function withGeneralReport(properties?: PostHogCaptureProperties) {
  // if a report has been created but not yet submitted, this function will attach it to the pending event's properties
  const includeExistingReportInProperties = async () => {
    const analyticsReport = await appStore.get("analyticsReport")
    if (!analyticsReport) return

    await appStore.set({ analyticsReport: undefined })
    properties = { ...properties, $set: { ...(properties?.$set ?? {}), ...analyticsReport } }
  }

  // if a report has already been created, include it in the event properties
  await includeExistingReportInProperties()

  // if it has been at least REPORTING_PERIOD ms since the last report was created, create a new report
  await spawnTaskToCreateNewReport()

  return properties
}

// If we've not created a report before, or if it has been REPORTING_PERIOD ms since we last created a report,
// this function will spawn an async task to create a new report in the background.
export const spawnTaskToCreateNewReport = async ({
  refreshBalances = true,
  waitForReportCreated,
}: {
  /**
   * If true or unset, the user's portfolio balances will be fetched from the chain before creating the new report.
   * If false, the existing balances cached will be used instead.
   */
  refreshBalances?: boolean
  /** If `waitForReportCreated` is true, this function won't resolve until the report has been created */
  waitForReportCreated?: boolean
} = {}) => {
  const analyticsReportCreatedAt = await appStore.get("analyticsReportCreatedAt")

  // if the wallet has already created a report, do nothing when the time since the last report is less than REPORTING_PERIOD
  const hasCreatedReport = typeof analyticsReportCreatedAt === "number"
  const timeSinceReportCreated = hasCreatedReport ? Date.now() - analyticsReportCreatedAt : 0
  if (hasCreatedReport && timeSinceReportCreated < REPORTING_PERIOD) return

  // if we're already creating a report (in response to an event which happened before this one)
  // then don't try to build another one at the same time
  if (isBuildingReport) return
  isBuildingReport = true

  // spawn async task (don't wait for it to complete before continuing)
  const reportComplete = (async () => {
    try {
      const analyticsReport = await getGeneralReport({ refreshBalances })

      // don't include general report if user is onboarding/has analytics turned off/other short-circuit conditions
      if (analyticsReport === undefined) return

      await appStore.set({ analyticsReportCreatedAt: Date.now(), analyticsReport })
    } catch (cause) {
      const error = new Error("Failed to build general report", { cause })
      console.warn(error) // eslint-disable-line no-console
      sentry.captureException(error)
    } finally {
      // set this flag back to false so we don't block the next report
      isBuildingReport = false
    }
  })()

  if (waitForReportCreated) await reportComplete
}

async function getGeneralReport({
  refreshBalances = true,
}: {
  /**
   * If true or unset, the user's portfolio balances will be fetched from the chain before creating the new report.
   * If false, the existing balances cached will be used instead.
   */
  refreshBalances?: boolean
} = {}) {
  const [allowTracking, onboarded] = await Promise.all([
    settingsStore.get("useAnalyticsTracking"),
    appStore.getIsOnboarded(),
  ])
  if (!allowTracking || !onboarded || IS_FIREFOX) return

  //
  // accounts
  //

  const accounts = await keyringStore.getAccounts()

  const ownedAccounts = accounts.filter(isAccountOwned)
  const ownedAccountsCount = ownedAccounts.length
  const ownedAddresses = ownedAccounts.map((account) => account.address)
  const ownedAddressesLower = ownedAddresses.map((a) => a.toLowerCase())

  // Don't create report if user doesn't have any accounts.
  // Prevents us from overriding a previous report for users who have upgraded to the latest
  // version of the wallet, but have not yet logged in to run the keyring migration.
  if (ownedAccountsCount < 1) return

  const watchedAccounts = accounts.filter((acc) => !isAccountOwned(acc))
  const watchedAccountsCount = watchedAccounts.length

  if (refreshBalances) {
    let disconnect!: () => void
    try {
      // create token balances / nft subscriptions, and wait for the pool to settle
      // this ensures that we have up-to-date information for the report
      const onDisconnected = new Promise<void>((resolve) => {
        let hasDisconnected = false
        disconnect = () => {
          if (hasDisconnected) return
          hasDisconnected = true
          resolve()
        }
      })

      let balancesLive = false
      let nftsLive = false

      // token balances
      const subscriptionId = "ANALYTICS-GENERAL-REPORT"
      balancePool.subscribe(subscriptionId, onDisconnected, (response) => {
        if (response.status !== "live") return
        balancesLive = true
        if (!nftsLive) return
        disconnect()
      })
      // nfts
      const unsubNfts = subscribeNfts((data) => {
        if (data.status !== "loaded") return
        nftsLive = true
        if (!balancesLive) return
        disconnect()
      })
      onDisconnected.then(() => unsubNfts())
      // timeout (don't wait forever for all token balances and nfts to be live)
      await sleep(30_000).then(disconnect)

      // wait for live token balances & nfts, or timeout to complete
      await onDisconnected
    } finally {
      // if anything throws, make sure we shut down all the subscriptions we opened
      disconnect()
    }
  }

  // account type breakdown
  const accountBreakdown: Record<Lowercase<LegacyAccountOrigin>, number> = {
    talisman: 0,
    qr: 0,
    ledger: 0,
    dcent: 0,
    watched: 0,
    signet: 0,
  }
  for (const account of accounts) {
    const origin = getLegacyAccountOrigin(account)
    const type = origin?.toLowerCase?.() as Lowercase<LegacyAccountOrigin> | undefined
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
          Object.fromEntries((dbTokenRates ?? []).map(({ tokenId, rates }) => [tokenId, rates])),
        ),
    ])

    const balanceJsons = Object.values(balancePool.balances).filter((balance) =>
      ownedAddresses.includes(balance.address),
    )
    /* eslint-disable-next-line no-var */
    var balances = new Balances(balanceJsons, { chains, evmNetworks, tokens, tokenRates })
  } catch (cause) {
    const error = new Error("Failed to access db to build general analyics report", { cause })
    DEBUG && console.error(error) // eslint-disable-line no-console
    throw error
  }

  // balances top 100 tokens/networks
  const TOP_BALANCES_COUNT = 100
  // get balance list per chain/evmNetwork and token
  const balancesPerChainToken = groupBy(
    balances.each.filter(
      (balance) =>
        balance &&
        (balance.chain === null || !("isCustom" in balance.chain && balance.chain.isCustom)) &&
        (balance.token === null || !("isCustom" in balance.token && balance.token.isCustom)),
    ),
    (balance) => `${balance.chainId ?? balance.evmNetworkId}-${balance.tokenId}`,
  )

  // get fiat sum object for those arrays of balances
  const sortedFiatSumPerChainToken = Object.values(balancesPerChainToken)
    .map((balances) => new Balances(balances, { chains, evmNetworks, tokens, tokenRates }))
    .map((balances) => ({
      totalBalance: balances.sum.fiat("usd").total,
      transferableBalance: balances.sum.fiat("usd").transferable,
      unavailableBalance: balances.sum.fiat("usd").unavailable,
      numAccounts: new Set(balances.each.map((b) => b.address)).size,
      chainId: balances.sorted[0].chainId ?? balances.sorted[0].evmNetworkId,
      tokenId: balances.sorted[0].tokenId,
      symbol: balances.sorted[0].token?.symbol,
    }))
    .sort((a, b) => b.totalBalance - a.totalBalance)

  const totalFiatValue = privacyRoundCurrency(balances.sum.fiat("usd").total)
  const transferableFiatValue = privacyRoundCurrency(balances.sum.fiat("usd").transferable)
  const unavailableFiatValue = privacyRoundCurrency(balances.sum.fiat("usd").unavailable)

  const tokensBreakdown = sortedFiatSumPerChainToken
    .filter((token, index) => token.totalBalance > 1 || index < TOP_BALANCES_COUNT)
    .map((token) => ({
      ...token,
      balance: privacyRoundCurrency(token.totalBalance),
      totalBalance: privacyRoundCurrency(token.totalBalance),
      transferableBalance: privacyRoundCurrency(token.transferableBalance),
      unavailableBalance: privacyRoundCurrency(token.unavailableBalance),
    }))

  const unroundedEcosystemBreakdown = sortedFiatSumPerChainToken
    .filter((token, index) => token.totalBalance > 1 || index < TOP_BALANCES_COUNT)
    .reduce(
      (acc, token) => {
        if (!token.chainId) return acc

        const eco = chains[token.chainId] ? acc.dot : evmNetworks[token.chainId] ? acc.eth : null
        if (!eco) return acc

        eco.totalBalance += token.totalBalance
        eco.transferableBalance += token.transferableBalance
        eco.unavailableBalance += token.unavailableBalance

        return acc
      },
      {
        dot: { totalBalance: 0, transferableBalance: 0, unavailableBalance: 0 },
        eth: { totalBalance: 0, transferableBalance: 0, unavailableBalance: 0 },
      },
    )
  const ecosystemBreakdown = Object.fromEntries(
    Object.entries(unroundedEcosystemBreakdown).map(([eco, totals]) => [
      eco,
      {
        totalBalance: privacyRoundCurrency(totals.totalBalance),
        transferableBalance: privacyRoundCurrency(totals.transferableBalance),
        unavailableBalance: privacyRoundCurrency(totals.unavailableBalance),
      },
    ]),
  )

  const topChainTokens = sortedFiatSumPerChainToken
    .filter(({ totalBalance }) => totalBalance > 0)
    .map(({ chainId, tokenId }) => ({ chainId, tokenId }))
    .slice(0, 5)

  const topToken = topChainTokens[0]
    ? `${topChainTokens[0].chainId}: ${topChainTokens[0].tokenId}`
    : undefined

  const numTokens = sortedFiatSumPerChainToken.length

  //
  // nfts
  //

  const hasGhosts = await hasGhostsOfThePast()
  const hasGhostsNft = Object.values(hasGhosts).some((g) => g)

  const ownedNfts = nftsStore$.value.nfts.filter((nft) =>
    nft.owners.some((o) => ownedAddressesLower.includes(o.address.toLowerCase())),
  )
  const ownedCollections = nftsStore$.value.collections.filter((c) =>
    ownedNfts.some((n) => n.collectionId === c.id),
  )

  const TOP_NFT_COLLECTIONS_COUNT = 20
  const nftsCount = ownedNfts.length
  const floorByCollectionId = Object.fromEntries(
    ownedCollections
      .map((collection) => [collection.id, getNftCollectionFloorUsd(collection)] as const)
      .filter(([, floor]) => !!floor),
  )
  const nftsTotalValue = ownedNfts.reduce(
    (total, nft) => total + (floorByCollectionId[nft.collectionId] ?? 0),
    0,
  )
  const topNftCollections = Object.entries(floorByCollectionId)
    .sort((c1, c2) => (c2[1] ?? 0) - (c1[1] ?? 0))
    .slice(0, TOP_NFT_COLLECTIONS_COUNT)
    .map(([collectionId]) => ownedCollections.find((c) => c.id === collectionId)?.name)

  return {
    // accounts
    accountBreakdown,
    accountsCount: ownedAccountsCount,
    watchedAccountsCount,

    // tokens
    totalFiatValue,
    transferableFiatValue,
    unavailableFiatValue,
    tokens: tokensBreakdown,
    ecosystems: ecosystemBreakdown,
    topChainTokens,
    topToken,
    numTokens,

    // nfts
    nftsCount,
    nftsTotalValue,
    topNftCollections,
    hasGhostsOfThePast: hasGhostsNft,

    // util
    lastGeneralReport: Math.trunc(Date.now() / 1000),
  }
}

const getLegacyAccountOrigin = (account: Account): LegacyAccountOrigin => {
  switch (account.type) {
    case "keypair":
      return LegacyAccountOrigin.Talisman
    case "ledger-ethereum":
    case "ledger-polkadot":
      return LegacyAccountOrigin.Ledger
    case "polkadot-vault":
      return LegacyAccountOrigin.Qr
    case "watch-only":
      return LegacyAccountOrigin.Watched
    case "signet":
      return LegacyAccountOrigin.Signet
    default:
      return account.type as LegacyAccountOrigin
  }
}
