import { Balances, IBalance } from "@talismn/balances"
import { normalizeAddress } from "@talismn/crypto"
import { isAccountOwned } from "@talismn/keyring"
import { log } from "extension-shared"
import { combineLatest, map, throttleTime } from "rxjs"

import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { balancesStore$ } from "../balances/store.balances"
import { keyringStore } from "../keyring/store"
import { tokenRatesStore } from "../tokenRates"
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
    chaindataProvider.getTokensMapById(),
    chaindataProvider.getNetworksMapById$(),
    balancesStore$.pipe(map((store) => store.balances)),
    tokenRatesStore.storage$.pipe(map((storage) => storage.tokenRates)),
  ])
    .pipe(throttleTime(1_000, undefined, { trailing: true }))
    .subscribe(async ([settings, accounts, tokens, networksById, balances, tokenRates]) => {
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

            const network = networksById[balance.networkId]
            if (network && isAccountCompatibleWithNetwork(network, account))
              acc[address].push(balance)

            return acc
          },
          {} as Record<string, IBalance[]>,
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
