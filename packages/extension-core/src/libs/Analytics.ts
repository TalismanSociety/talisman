import keyring from "@polkadot/ui-keyring"
import { DEBUG } from "extension-shared"
import posthog, { Properties } from "posthog-js"

import { initPosthog } from "../config/posthog"
import { db } from "../db"
import { AccountType } from "../domains/accounts/types"
import { appStore } from "../domains/app/store.app"
import { settingsStore } from "../domains/app/store.settings"
import { balancePool } from "../domains/balances/pool"
import { Balance, Balances } from "../domains/balances/types"
import { chaindataProvider } from "../rpcs/chaindata"
import { hasGhostsOfThePast } from "../util/hasGhostsOfThePast"
import { roundToFirstInteger } from "../util/roundToFirstInteger"

const REPORTING_PERIOD = 24 * 3600 * 1000 // 24 hours

const ensurePosthogPreferences = (useAnalyticsTracking: boolean | undefined) => {
  if (useAnalyticsTracking === undefined) {
    if (posthog.has_opted_in_capturing() || posthog.has_opted_out_capturing())
      posthog.clear_opt_in_out_capturing()
  } else if (
    useAnalyticsTracking &&
    (!posthog.has_opted_in_capturing() || posthog.has_opted_out_capturing())
  ) {
    posthog.opt_in_capturing()
  } else if (
    !useAnalyticsTracking &&
    (posthog.has_opted_in_capturing() || !posthog.has_opted_out_capturing())
  ) {
    posthog.opt_out_capturing()
  }
}

class TalismanAnalytics {
  lastGeneralReport: undefined | number
  enabled = Boolean(process.env.POSTHOG_AUTH_TOKEN)

  constructor() {
    if (!this.enabled) return

    this.init().then(() => {
      settingsStore.observable.subscribe(({ useAnalyticsTracking }) => {
        ensurePosthogPreferences(useAnalyticsTracking)
      })

      appStore.observable.subscribe(({ analyticsReportSent }) => {
        this.lastGeneralReport = analyticsReportSent || Date.now()
      })
    })
  }

  async init() {
    const allowTracking = await settingsStore.get("useAnalyticsTracking")
    initPosthog()
    ensurePosthogPreferences(allowTracking)
  }

  async capture(eventName: string, properties?: Properties) {
    if (!this.enabled) return

    // have to put this manual check here because posthog is buggy and will not respect our settings
    // https://github.com/PostHog/posthog-js/issues/336
    const allowTracking = await settingsStore.get("useAnalyticsTracking")

    // we need to allow tracking during onboarding, while value is not defined
    // so we need to explicitely check for false
    if (allowTracking === false) return

    try {
      let sendProperties = properties
      if (this.lastGeneralReport && Date.now() > this.lastGeneralReport + REPORTING_PERIOD) {
        const generalData = await this.getGeneralReport()
        sendProperties = { ...properties, $set: { ...(properties?.$set || {}), ...generalData } }
        appStore.set({ analyticsReportSent: Date.now() })
      }
      posthog.capture(eventName, sendProperties)
    } catch (e) {
      // eslint-disable-next-line no-console
      DEBUG && console.log("error ", { e })
    }
  }

  async captureDelayed(eventName: string, properties?: Properties, delaySeconds = 900) {
    setTimeout(() => {
      this.capture(eventName, properties)
    }, delaySeconds * 1000 * Math.random())
  }

  async getGeneralReport() {
    /*
    // This should get sent at most once per 24 hours, whenever any other events get sent
    */
    const allowTracking = await settingsStore.get("useAnalyticsTracking")
    const onboarded = await appStore.getIsOnboarded()
    if (!allowTracking || !onboarded) return

    // accounts
    const accounts = keyring.getAccounts()
    let accountBreakdown: Record<Lowercase<AccountType>, number> = {
      talisman: 0,
      ledger: 0,
      qr: 0,
      dcent: 0,
      watched: 0,
      signet: 0,
    }

    // cache chains, evmNetworks, tokens, tokenRates and balances here to prevent lots of fetch calls
    try {
      /* eslint-disable no-var */
      var chains = await chaindataProvider.chainsById()
      var evmNetworks = await chaindataProvider.evmNetworksById()
      var tokens = await chaindataProvider.tokensById()
      var tokenRates = Object.fromEntries(
        ((await db.tokenRates.toArray()) || []).map(({ tokenId, rates }) => [tokenId, rates])
      )

      // account type breakdown
      accountBreakdown = accounts.reduce((result, account) => {
        const accountType = (
          account.meta.origin as AccountType
        ).toLowerCase() as Lowercase<AccountType>
        result[accountType] += 1
        return result
      }, accountBreakdown)

      // consider only accounts that are not watched accounts
      const ownedAddresses = accounts
        .filter((account) => account.meta.origin !== "WATCHED")
        .map((account) => account.address)

      // balances + balances fiat sum estimate
      var balances = new Balances(
        Object.values(balancePool.balances).filter((balance) =>
          ownedAddresses.includes(balance.address)
        ),
        {
          chains,
          evmNetworks,
          tokens,
          tokenRates,
        }
      )
      /* eslint-enable no-var */
    } catch (cause) {
      const error = new Error("Failed to access db to build general analyics report", { cause })
      // eslint-disable-next-line no-console
      DEBUG && console.error(error)
      throw error
    }

    // balances top 5 tokens/networks
    // get Balance list per chain/evmNetwork and token
    const balancesPerChainToken: Record<string, Balance[]> = balances.each
      .filter(Boolean)
      .filter(
        (balance) =>
          (balance.chain === null || !("isCustom" in balance.chain && balance.chain.isCustom)) &&
          (balance.token === null || !("isCustom" in balance.token && balance.token.isCustom))
      )
      .reduce((result, balance) => {
        const key = `${balance.chainId || balance.evmNetworkId}-${balance.tokenId}`

        if (!result[key]) result[key] = []
        result[key].push(balance)

        return result
      }, {} as { [key: string]: Balance[] })

    // get fiat sum object for those arrays of Balances
    const sortedFiatSumPerChainToken = await Promise.all(
      Object.values(balancesPerChainToken).map(async (balances) => {
        const balancesInstance = new Balances(balances, { chains, evmNetworks, tokens, tokenRates })
        return {
          balance: balancesInstance.sum.fiat("usd").total,
          chainId: balancesInstance.sorted[0].chainId || balancesInstance.sorted[0].evmNetworkId,
          tokenId: balancesInstance.sorted[0].tokenId,
        }
      })
    ).then((fiatBalances) => fiatBalances.sort((a, b) => b.balance - a.balance))

    const topChainTokens = sortedFiatSumPerChainToken
      .filter(({ balance }) => balance > 0)
      .map(({ chainId, tokenId }) => ({ chainId, tokenId }))
      .slice(0, 5)

    const topToken = topChainTokens[0]

    const hasGhosts = await hasGhostsOfThePast()
    const hasGhostsNft = Object.values(hasGhosts).some((g) => g)

    return {
      accountBreakdown,
      accountsCount: keyring.getAccounts().filter(({ meta }) => meta.origin !== AccountType.Watched)
        .length,
      totalFiatValue: roundToFirstInteger(balances.sum.fiat("usd").total),
      topToken: topToken ? `${topToken.chainId}: ${topToken.tokenId}` : undefined,
      tokens: sortedFiatSumPerChainToken
        .filter((token, index) => token.balance > 1 || index < 10)
        .map((token) => ({
          ...token,
          balance: roundToFirstInteger(token.balance),
        })),
      hasGhostsOfThePast: hasGhostsNft,
      topChainTokens,
    }
  }
}

export const talismanAnalytics = new TalismanAnalytics()
