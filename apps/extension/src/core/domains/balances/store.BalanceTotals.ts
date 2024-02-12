import { db as extensionDb } from "@core/db"
import { StorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { awaitKeyringLoaded } from "@core/util/awaitKeyringLoaded"
import keyring from "@polkadot/ui-keyring"
import { Address, BalanceJson, Balances, db as balancesDb } from "@talismn/balances"
import { TokenRateCurrency, TokenRatesList } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { combineLatest, throttleTime } from "rxjs"

import { settingsStore } from "../app/store.settings"
import { BalanceTotal } from "./types"

export const balanceTotalsStore = new StorageProvider<
  Record<`${Address}:${TokenRateCurrency}`, BalanceTotal>
>("balanceTotals")

const MAX_UPDATE_INTERVAL = 1_000 // update every 1 second maximum

export const trackBalanceTotals = async () => {
  await awaitKeyringLoaded()

  combineLatest([
    settingsStore.observable,
    keyring.accounts.subject,
    chaindataProvider.tokensListObservable,
    liveQuery(() => balancesDb.balances.toArray()),
    liveQuery(() => extensionDb.tokenRates.toArray()),
  ])
    .pipe(throttleTime(MAX_UPDATE_INTERVAL, undefined, { trailing: true }))
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
          Object.keys(accounts).flatMap((address) => {
            const balances = new Balances(balancesByAddress[address] ?? [], {
              tokens,
              tokenRates,
            })
            return settings.selectableCurrencies.map((currency) => {
              const total = balances.sum.fiat(currency).total
              return [`${address}::${currency}`, { address, total, currency }]
            })
          })
        )

        await balanceTotalsStore.replace(totals)
      } catch (err) {
        log.error("trackBalanceTotals", { err })
      }
    })
}
