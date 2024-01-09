import { db as extensionDb } from "@core/db"
import { StorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { awaitKeyringLoaded } from "@core/util/awaitKeyringLoaded"
import keyring from "@polkadot/ui-keyring"
import { Address, BalanceJson, Balances, db as balancesDb } from "@talismn/balances"
import { TokenRatesList } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { combineLatest, debounceTime } from "rxjs"

import { settingsStore } from "../app/store.settings"
import { BalanceTotal } from "./types"

export const balanceTotalsStore = new StorageProvider<Record<Address, BalanceTotal>>(
  "balanceTotals"
)

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
        const tokenRates: TokenRatesList = Object.fromEntries(
          allTokenRates.map(({ tokenId, rates }) => [tokenId, rates])
        )

        const balancesByAddress = balances.reduce((acc, balance) => {
          const { address } = balance
          if (!acc[address]) acc[address] = []
          acc[address].push(balance)
          return acc
        }, {} as Record<string, BalanceJson[]>)

        const totals = Object.fromEntries(
          Object.keys(accounts).flatMap((address) =>
            settings.selectableCurrencies.map((currency) => {
              const balances = new Balances(balancesByAddress[address] ?? [], {
                tokens,
                tokenRates,
              })
              const total = balances.sum.fiat(currency).total

              return [`${address}::${currency}`, { address, total, currency }]
            })
          )
        )

        await balanceTotalsStore.replace(totals)
      } catch (err) {
        log.error("trackBalanceTotals", { err })
      }
    })
}
