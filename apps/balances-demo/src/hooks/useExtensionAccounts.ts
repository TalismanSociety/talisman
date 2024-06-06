import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp"
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"
import { useAtomValue } from "jotai"
import { atomWithObservable } from "jotai/utils"
import { Observable } from "rxjs"

/**
 * Connects to the web3 provider (e.g. talisman) and subscribes to the list of account addresses.
 * Suspends the UI while the accounts are loading.
 */
export const useExtensionAccounts = () => useAtomValue(accountsAtom)

/** An atom which subscribes to the list of accounts from the extension */
const accountsAtom = atomWithObservable(
  () =>
    new Observable<InjectedAccountWithMeta[]>((subscriber) => {
      // set up abort signal to track subscriber
      const abort = new AbortController()

      const unsubscribePromise = (async () => {
        // connect to the extension
        const extensions = await web3Enable("balances-demo")
        if (abort.signal.aborted) return // stop here if our subscriber has disconnected

        if (extensions.length === 0) subscriber.next([])

        // subscribe to the list of accounts from the extension
        return await web3AccountsSubscribe((accounts) => {
          if (abort.signal.aborted) return // stop here if our subscriber has disconnected
          subscriber.next(accounts)
        })
      })()

      // close the extension accounts subscription when our subscriber disconnects
      abort.signal.onabort = () => unsubscribePromise.then((unsubscribe) => unsubscribe?.())

      // trigger abort signal when our component is unmounted
      return () => abort.abort("Unsubscribed")
    })
)
