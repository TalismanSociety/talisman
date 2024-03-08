import keyring from "@polkadot/ui-keyring"
import { Address, BalanceJson, Balances, db as balancesDb } from "@talismn/balances"
import { TokenRateCurrency, TokenRatesList } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { combineLatest, throttleTime } from "rxjs"

import { db as extensionDb } from "../../db"
import { StorageProvider } from "../../libs/Store"
import { chaindataProvider } from "../../rpcs/chaindata"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
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
    chaindataProvider.tokensByIdObservable,
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
