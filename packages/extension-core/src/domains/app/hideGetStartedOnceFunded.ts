import { BalanceJson, Balances } from "@talismn/balances"
import { isAccountEthereum, isAccountOfType, isAccountOwned } from "@talismn/keyring"
import { TokenRatesList } from "@talismn/token-rates"
import { normalizeAddress } from "@talismn/util"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { combineLatest, throttleTime } from "rxjs"

import { db } from "../../db"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithChain } from "../accounts/helpers"
import { balancePool } from "../balances/pool"
import { keyringStore } from "../keyring/store"
import { appStore } from "./store.app"
import { settingsStore } from "./store.settings"

/**
 * watches balances of owned accounts and as soon as one is found, hides the get started screen
 * @returns
 */
export const hideGetStartedOnceFunded = async () => {
  const hideGetStarted = await appStore.get("hideGetStarted")
  if (hideGetStarted) return

  const sub = combineLatest([
    settingsStore.observable,
    keyringStore.accounts$,
    chaindataProvider.tokensByIdObservable,
    chaindataProvider.chainsByIdObservable,
    balancePool.observable,
    liveQuery(() => db.tokenRates.toArray()),
  ])
    .pipe(throttleTime(1_000, undefined, { trailing: true }))
    .subscribe(async ([settings, accounts, tokens, chainsById, balances, allTokenRates]) => {
      try {
        const mapOwnedAccounts = Object.fromEntries(
          accounts.filter(isAccountOwned).map((account) => [account.address, account]),
        )

        if (!Object.keys(mapOwnedAccounts).length) return

        const balancesByAddress = Object.values(balances).reduce(
          (acc, balance) => {
            const address = normalizeAddress(balance.address)
            const account = mapOwnedAccounts[address]
            if (!account) return acc

            if (!acc[address]) acc[address] = []
            if (isAccountEthereum(account)) acc[address].push(balance)
            else {
              const chain = "chainId" in balance && balance.chainId && chainsById[balance.chainId]
              if (!chain || isAccountOfType(account, "contact")) return acc
              if (isAccountCompatibleWithChain(chain, account)) acc[address].push(balance)
            }
            return acc
          },
          {} as Record<string, BalanceJson[]>,
        )

        const tokenRates: TokenRatesList = Object.fromEntries(
          allTokenRates.map(({ tokenId, rates }) => [tokenId, rates]),
        )

        for (const address of Object.keys(mapOwnedAccounts)) {
          const accBalances = new Balances(balancesByAddress[address] ?? [], {
            tokens,
            tokenRates,
          })
          if (accBalances.sum.fiat(settings.selectedCurrency).total > 0) {
            await appStore.set({ hideGetStarted: true })
            sub.unsubscribe()
            break
          }
        }
      } catch (err) {
        log.error("hideGetStartedOnceFunded", { err })
      }
    })
}
