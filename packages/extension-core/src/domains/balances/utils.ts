import { Balances, IBalance } from "@talismn/balances"
import { isAccountNotContact } from "@talismn/keyring"
import { TokenRatesList } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { combineLatest, map, throttleTime } from "rxjs"

import { db as extensionDb } from "../../db"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { settingsStore } from "../app/store.settings"
import { keyringStore } from "../keyring/store"
import { balancesStore$ } from "./store.balances"
import { balanceTotalsStore } from "./store.BalanceTotals"

import "./types"

const MAX_UPDATE_INTERVAL = 1_000 // update every 1 second maximum

/**
 * Updates the balance totals in the store.
 * Should not be used in frontend, since it uses the balance pool.
 */
export const trackBalanceTotals = async () => {
  combineLatest([
    settingsStore.observable,
    keyringStore.accounts$,
    chaindataProvider.getTokensMapById$(),
    chaindataProvider.getNetworksMapById$(),
    balancesStore$.pipe(map((store) => store.balances)),
    liveQuery(() => extensionDb.tokenRates.toArray()),
  ])
    .pipe(throttleTime(MAX_UPDATE_INTERVAL, undefined, { trailing: true }))
    .subscribe(async ([settings, accounts, tokens, networks, balances, allTokenRates]) => {
      try {
        const mapAccounts = Object.fromEntries(
          accounts.filter(isAccountNotContact).map((account) => [account.address, account]),
        )

        const tokenRates: TokenRatesList = Object.fromEntries(
          allTokenRates.map(({ tokenId, rates }) => [tokenId, rates]),
        )

        const balancesByAddress = Object.values(balances).reduce(
          (acc, balance) => {
            const { address, networkId } = balance
            const account = mapAccounts[address]
            if (!account) return acc

            // ignore if token rate isnt available yet
            if (!tokenRates[balance.tokenId]) return acc

            if (!acc[address]) acc[address] = []

            const network = networks[networkId]
            if (network && isAccountCompatibleWithNetwork(network, account))
              acc[address].push(balance)

            return acc
          },
          {} as Record<string, IBalance[]>,
        )

        const totals = Object.fromEntries(
          accounts.flatMap(({ address }) => {
            const balances = new Balances(balancesByAddress[address] ?? [], {
              tokens,
              tokenRates,
              networks,
            })
            return settings.selectableCurrencies.map((currency) => {
              const total = balances.sum.fiat(currency).total
              return [`${address}::${currency}`, { address, total, currency }]
            })
          }),
        )

        await balanceTotalsStore.replace(totals)
      } catch (err) {
        log.error("trackBalanceTotals", { err })
      }
    })
}
