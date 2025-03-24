import keyring from "@polkadot/ui-keyring"
import { BalanceJson, Balances } from "@talismn/balances"
import { TokenRatesList } from "@talismn/token-rates"
import { normalizeAddress } from "@talismn/util"
import { liveQuery } from "dexie"
import { log } from "extension-shared"
import { combineLatest, throttleTime } from "rxjs"

import { db } from "../../db"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { isAccountCompatibleWithChain, isOwnedAccountOrigin } from "../accounts/helpers"
import { AccountType } from "../accounts/types"
import { balancePool } from "../balances/pool"
import { chaindataProvider } from "../chains/chaindataProvider"
import { appStore } from "./store.app"
import { settingsStore } from "./store.settings"

/**
 * watches balances of owned accounts and as soon as one is found, hides the get started screen
 * @returns
 */
export const hideGetStartedOnceFunded = async () => {
  const hideGetStarted = await appStore.get("hideGetStarted")
  if (hideGetStarted) return

  await awaitKeyringLoaded()

  const sub = combineLatest([
    settingsStore.observable,
    keyring.accounts.subject,
    chaindataProvider.tokensByIdObservable,
    chaindataProvider.chainsByIdObservable,
    balancePool.observable,
    liveQuery(() => db.tokenRates.toArray()),
  ])
    .pipe(throttleTime(1_000, undefined, { trailing: true }))
    .subscribe(async ([settings, accounts, tokens, chainsById, balances, allTokenRates]) => {
      try {
        const ownedAddresses = Object.entries(accounts)
          .filter(([, acc]) => isOwnedAccountOrigin(acc.json.meta.origin as AccountType))
          .map(([address]) => normalizeAddress(address))

        if (!ownedAddresses.length) return

        const balancesByAddress = Object.values(balances).reduce(
          (acc, balance) => {
            const address = normalizeAddress(balance.address)
            if (!ownedAddresses.includes(address)) return acc

            const account = accounts[balance.address]
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
          },
          {} as Record<string, BalanceJson[]>,
        )

        const tokenRates: TokenRatesList = Object.fromEntries(
          allTokenRates.map(({ tokenId, rates }) => [tokenId, rates]),
        )

        for (const address of ownedAddresses) {
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
