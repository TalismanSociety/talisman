import { db as extensionDb } from "@core/db"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { awaitKeyringLoaded } from "@core/util/awaitKeyringLoaded"
import keyring from "@polkadot/ui-keyring"
import { BalanceJson, Balances, db as balancesDb } from "@talismn/balances"
import { TokenRatesList } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { combineLatest, debounceTime } from "rxjs"

import { settingsStore } from "../app/store.settings"

const MAX_UPDATE_INTERVAL = 2_000 // update every 2 seconds maximum

export const trackBalanceTotals = async () => {
  await awaitKeyringLoaded()

  combineLatest([
    settingsStore.observable,
    keyring.accounts.subject,
    liveQuery(async () => await chaindataProvider.tokens()),
    liveQuery(async () => await balancesDb.balances.toArray()),
    liveQuery(async () => await extensionDb.tokenRates.toArray()),
  ])
    .pipe(debounceTime(MAX_UPDATE_INTERVAL))
    .subscribe(async ([settings, accounts, tokens, balances, allTokenRates]) => {
      try {
        const { selectedCurrency: currency } = settings

        const tokenRates: TokenRatesList = Object.fromEntries(
          allTokenRates.map(({ tokenId, rates }) => [tokenId, rates])
        )

        const balancesByAddress = balances.reduce((acc, balance) => {
          const { address } = balance
          if (!acc[address]) acc[address] = []
          acc[address].push(balance)
          return acc
        }, {} as Record<string, BalanceJson[]>)

        const totals = Object.keys(accounts).map((address) => {
          const balances = new Balances(balancesByAddress[address] ?? [], {
            tokens,
            tokenRates,
          })
          const sum = balances.sum.fiat(currency).total

          return { address, sum, currency }
        })

        extensionDb.transaction("rw", extensionDb.balanceTotals, async () => {
          await extensionDb.balanceTotals.clear()
          await extensionDb.balanceTotals.bulkAdd(totals)
        })
      } catch (err) {
        log.error("trackBalanceTotals", { err })
      }
    })
}
