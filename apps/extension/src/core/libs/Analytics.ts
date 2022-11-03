import { initPosthog } from "@core/config/posthog"
import { DEBUG } from "@core/constants"
import { AccountTypes } from "@core/domains/accounts/helpers"
import { settingsStore } from "@core/domains/app/store.settings"
import { Balance, Balances } from "@core/domains/balances/types"
import { db } from "@core/libs/db"
import { roundToFirstInteger } from "@core/util/roundToFirstInteger"
import keyring from "@polkadot/ui-keyring"
import * as Sentry from "@sentry/browser"
import posthog from "posthog-js"

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
  lastGeneralReport = Date.now()
  enabled = Boolean(process.env.POSTHOG_AUTH_TOKEN)

  constructor() {
    if (!this.enabled) return

    this.init().then(() => {
      settingsStore.observable.subscribe(({ useAnalyticsTracking }) => {
        ensurePosthogPreferences(useAnalyticsTracking)
      })
    })
  }

  async init() {
    const allowTracking = await settingsStore.get("useAnalyticsTracking")
    initPosthog()
    ensurePosthogPreferences(allowTracking)
  }

  async capture(eventName: string, properties?: posthog.Properties) {
    if (!this.enabled) return

    // have to put this manual check here because posthog is buggy and will not respect our settings
    // https://github.com/PostHog/posthog-js/issues/336
    const allowTracking = await settingsStore.get("useAnalyticsTracking")

    // we need to allow tracking during onboarding, while value is not defined
    // so we need to explicitely check for false
    if (allowTracking === false) return

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

  async captureDelayed(eventName: string, properties?: posthog.Properties, delaySeconds = 900) {
    setTimeout(() => {
      this.capture(eventName, properties)
    }, delaySeconds * 1000 * Math.random())
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

    // cache chains, evmNetworks and tokens here to prevent lots of fetch calls
    const chains = Object.fromEntries(
      ((await db.chains.toArray()) || []).map((chain) => [chain.id, chain])
    )
    const evmNetworks = Object.fromEntries(
      ((await db.evmNetworks.toArray()) || []).map((evmNetwork) => [evmNetwork.id, evmNetwork])
    )
    const tokens = Object.fromEntries(
      ((await db.tokens.toArray()) || []).map((token) => [token.id, token])
    )

    // balances + balances fiat sum estimate
    const balances = new Balances(await db.balances.toArray(), { chains, evmNetworks, tokens })

    posthog.capture("balances fiat sum", {
      total: roundToFirstInteger(balances.sum.fiat("usd").total),
    })

    // balances top 5 tokens/networks
    // get Balance list per chain/evmNetwork and token
    const balancesPerChainToken: Record<string, Balance[]> = [...balances]
      .filter(Boolean)
      .reduce((result, balance) => {
        const key = `${balance.chainId || balance.evmNetworkId}-${balance.tokenId}`

        if (!result[key]) result[key] = []
        result[key].push(balance)

        return result
      }, {} as { [key: string]: Balance[] })

    // get fiat sum object for those arrays of Balances
    const fiatSumPerChainToken = await Promise.all(
      Object.values(balancesPerChainToken).map(async (balances) => {
        const balancesInstance = new Balances(balances, { chains, evmNetworks, tokens })
        return {
          balance: balancesInstance.sum.fiat("usd").total,
          chainId: balancesInstance.sorted[0].chainId || balancesInstance.sorted[0].evmNetworkId,
          tokenId: balancesInstance.sorted[0].tokenId,
        }
      })
    ).then((fiatBalances) => fiatBalances.sort((a, b) => b.balance - a.balance))

    const topChainTokens = fiatSumPerChainToken
      .filter(({ balance }) => balance > 0)
      .map(({ chainId, tokenId }) => ({ chainId, tokenId }))
      .slice(0, 5)

    posthog.capture("balances top tokens", topChainTokens)
  }
}

export const talismanAnalytics = new TalismanAnalytics()
