import { isAccountAddressEthereum, isAccountNotContact, isAccountOfType } from "@talismn/keyring"
import { TokenRatesList } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { combineLatest, throttleTime } from "rxjs"

import { db as extensionDb } from "../../db"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithChain } from "../accounts/helpers"
import { settingsStore } from "../app/store.settings"
import { keyringStore } from "../keyring/store"
import { balancePool } from "./pool"
import { balanceTotalsStore } from "./store.BalanceTotals"
import { BalanceJson, Balances } from "./types"

const MAX_UPDATE_INTERVAL = 1_000 // update every 1 second maximum

/**
 * Updates the balance totals in the store.
 * Should not be used in frontend, since it uses the balance pool.
 */
export const trackBalanceTotals = async () => {
  combineLatest([
    settingsStore.observable,
    keyringStore.accounts$,
    chaindataProvider.tokensByIdObservable,
    chaindataProvider.chainsByIdObservable,
    balancePool.observable,
    liveQuery(() => extensionDb.tokenRates.toArray()),
  ])
    .pipe(throttleTime(MAX_UPDATE_INTERVAL, undefined, { trailing: true }))
    .subscribe(async ([settings, accounts, tokens, chainsById, balances, allTokenRates]) => {
      try {
        const mapAccounts = Object.fromEntries(
          accounts.filter(isAccountNotContact).map((account) => [account.address, account]),
        )

        const tokenRates: TokenRatesList = Object.fromEntries(
          allTokenRates.map(({ tokenId, rates }) => [tokenId, rates]),
        )

        const balancesByAddress = Object.values(balances).reduce(
          (acc, balance) => {
            const { address } = balance
            const account = mapAccounts[address]
            if (!account) return acc

            if (!acc[address]) acc[address] = []
            if (isAccountAddressEthereum(account)) acc[address].push(balance)
            else {
              const chain = "chainId" in balance && balance.chainId && chainsById[balance.chainId]
              if (!chain || isAccountOfType(account, "contact")) return acc
              if (isAccountCompatibleWithChain(chain, account)) acc[address].push(balance)
            }
            return acc
          },
          {} as Record<string, BalanceJson[]>,
        )

        const totals = Object.fromEntries(
          accounts.flatMap(({ address }) => {
            const balances = new Balances(balancesByAddress[address] ?? [], {
              tokens,
              tokenRates,
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
