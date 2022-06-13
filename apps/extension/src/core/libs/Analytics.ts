import posthog from "posthog-js"
import { settingsStore } from "@core/domains/app/store.settings"
import { initPosthog } from "@core/config/posthog"
import * as Sentry from "@sentry/browser"
import { DEBUG } from "@core/constants"
import keyring from "@polkadot/ui-keyring"
import balancesStore from "@core/domains/balances/store"
import { Balances, Balance } from "@core/domains/balances/types"
import { chainStore } from "@core/domains/chains"
import { tokenStore } from "@core/domains/tokens"
import { AccountTypes } from "@core/domains/accounts/helpers"
import { roundToFirstInteger } from "@core/util/roundToFirstInteger"

const REPORTING_PERIOD = 24 * 3600 * 1000 // 24 hours

class TalismanAnalytics {
  lastGeneralReport = Date.now()
  enabled = Boolean(process.env.POSTHOG_AUTH_TOKEN)

  constructor() {
    if (!this.enabled) return

    this.init().then(() => {
      settingsStore.observable.subscribe(({ useAnalyticsTracking }) => {
        if (useAnalyticsTracking && !posthog.has_opted_in_capturing()) posthog.opt_in_capturing()
        else if (!useAnalyticsTracking) posthog.clear_opt_in_out_capturing()
      })
    })
  }

  async init() {
    const allowTracking = await settingsStore.get("useAnalyticsTracking")
    return initPosthog(allowTracking)
  }

  async capture(eventName: string, properties?: posthog.Properties) {
    if (!this.enabled) return

    // have to put this manual check here because posthog is buggy and will not respect our settings
    // https://github.com/PostHog/posthog-js/issues/336
    const allowTracking = await settingsStore.get("useAnalyticsTracking")
    if (!allowTracking) return

    try {
      posthog.capture(eventName, properties)
      if (Date.now() > this.lastGeneralReport) {
        this.sendGeneralReport()
        this.lastGeneralReport = Date.now() + REPORTING_PERIOD
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      DEBUG && console.log("error ", { e })
      Sentry.captureException(e)
    }
  }

  async sendGeneralReport() {
    /*
    // This should get sent at most once per 24 hours, whenever any other events get sent
    */
    const allowTracking = await settingsStore.get("useAnalyticsTracking")
    if (!allowTracking) return

    // accounts
    const accounts = keyring.getAccounts()
    if (accounts.length > 0) {
      posthog.capture("accounts count", { count: keyring.getAccounts().length })
      // account type breakdown
      const accountBreakdown = accounts.reduce(
        (result, account) => {
          const accountType = (
            account.meta.origin as keyof typeof AccountTypes
          ).toLowerCase() as Lowercase<keyof typeof AccountTypes>
          result[accountType] += 1
          return result
        },
        {
          root: 0,
          derived: 0,
          hardware: 0,
          seed: 0,
          json: 0,
        } as Record<Lowercase<keyof typeof AccountTypes>, number>
      )
      posthog.capture("accounts breakdown", { accountBreakdown })
    }
    // balances
    const balances = await balancesStore.get()
    // cache chains and tokens here to prevent lots of fetch calls
    const chains = await chainStore.chains()
    const tokens = await tokenStore.tokens()

    const hydration = {
      chain: (chainId: string) => Promise.resolve(chains[chainId]),
      token: (tokenId: string) => Promise.resolve(tokens[tokenId]),
    }

    // balances fiat sum estimate
    const allBalances = new Balances(balances)
    await allBalances.hydrate(hydration)

    posthog.capture("balances fiat sum", {
      total: roundToFirstInteger(allBalances.sum.fiat("usd").total),
    })

    // balances top 5 tokens/networks
    // get Balance list per chain and token
    const balancesPerChainToken = Object.values(balances).reduce((result, balance) => {
      const key = `${balance.chainId}-${balance.tokenId}`
      if (!result[key]) result[key] = []
      result[key].push(new Balance(balance))
      return result
    }, {} as { [key: string]: Balance[] })

    // get fiat sum object for those arrays of Balances
    const fiatSumPerChainToken = await Promise.all(
      Object.values(balancesPerChainToken).map(async (balances) => {
        const balanceObject = new Balances(balances)
        await balanceObject.hydrate(hydration)
        return {
          balance: balanceObject.sum.fiat("usd").total,
          chainId: balances[0].chainId,
          tokenId: balances[0].tokenId,
        }
      })
    ).then((fiatBalances) => fiatBalances.sort((a, b) => b.balance - a.balance))

    const topChainTokens = fiatSumPerChainToken
      .map(({ chainId, tokenId }) => ({ chainId, tokenId }))
      .slice(0, 5)

    posthog.capture("balances top tokens", topChainTokens)
  }
}

export const talismanAnalytics = new TalismanAnalytics()
