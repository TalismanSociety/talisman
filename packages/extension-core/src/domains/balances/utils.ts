import keyring from "@polkadot/ui-keyring"
import { TokenRatesList } from "@talismn/token-rates"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { combineLatest } from "rxjs"
import { throttleTime } from "rxjs"

import { db as extensionDb } from "../../db"
import { chaindataProvider } from "../../rpcs/chaindata"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { isAccountCompatibleWithChain } from "../accounts/helpers"
import { settingsStore } from "../app/store.settings"
import { balancePool } from "./pool"
import { balanceTotalsStore } from "./store.BalanceTotals"
import { BalanceJson, Balances } from "./types"

const MAX_UPDATE_INTERVAL = 1_000 // update every 1 second maximum

/**
 * Updates the balance totals in the store.
 * Should not be used in frontend, since it uses the balance pool.
 */
export const trackBalanceTotals = async () => {
  await awaitKeyringLoaded()

  combineLatest([
    settingsStore.observable,
    keyring.accounts.subject,
    chaindataProvider.tokensByIdObservable,
    chaindataProvider.chainsByIdObservable,
    balancePool.observable,
    liveQuery(() => extensionDb.tokenRates.toArray()),
  ])
    .pipe(throttleTime(MAX_UPDATE_INTERVAL, undefined, { trailing: true }))
    .subscribe(async ([settings, accounts, tokens, chainsById, balances, allTokenRates]) => {
      try {
        const tokenRates: TokenRatesList = Object.fromEntries(
          allTokenRates.map(({ tokenId, rates }) => [tokenId, rates])
        )

        const balancesByAddress = Object.values(balances).reduce((acc, balance) => {
          const { address } = balance
          const account = accounts[address]
          if (!account) return acc

          if (!acc[address]) acc[address] = []
          if (account.type === "ethereum") acc[address].push(balance)
          else {
            const chain = "chainId" in balance && balance.chainId && chainsById[balance.chainId]
            if (!chain || !account.type) return acc
            if (isAccountCompatibleWithChain(chain, account.type, account.json.meta.genesisHash))
              acc[address].push(balance)
          }
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
