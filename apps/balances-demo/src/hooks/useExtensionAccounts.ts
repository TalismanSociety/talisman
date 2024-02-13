import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp"
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"
import { useEffect, useState } from "react"

/**
 * Connects to the web3 provider (e.g. talisman) and subscribes to the list of account addresses.
 */
export function useExtensionAccounts() {
  // some state to store the list of account addresses which we plan to fetch from the extension
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[] | null>(null)

  useEffect(() => {
    const unsubscribePromise = (async () => {
      // connect to the extension
      await web3Enable("balances-demo")

      // subscribe to the list of accounts from the extension
      const unsubscribe = await web3AccountsSubscribe((accounts) =>
        // provide the list of accounts to the caller of this hook
        setAccounts(accounts)
      )

      // return the unsubscribe callback, which we can retrieve later with `unsubscribePromise.then`
      return unsubscribe
    })()

    // when our hook is unmounted, we want to unsubscribe from the list of accounts from the extension
    return () => {
      // unsubscribePromise is just a Promise, we call `.then` to retrieve the inner unsubscribe callback
      unsubscribePromise.then((unsubscribe) => {
        // this is where we actually unsubscribe
        unsubscribe()
      })
    }
  }, [])

  // provide the list of account addresses to the caller of this hook
  return accounts
}
