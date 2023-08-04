import { AccountJson } from "@core/domains/accounts/types"
import { api } from "@ui/api"
import { useEffect, useState } from "react"

/**
 * useAccountsSubscribe
 *  - Subscribe to accounts updates
 *  - Returns an array of AccountJson objects once subscription is initialized
 *  - Returns undefined if subscription is not initialized
 * * Needed to avoid returning an empty array when the subscription is not initialized
 * * TODO: can be removed once useMessageSubscription is fixed to enable this behavior
 *
 * @returns array of AccountJson objects or undefined
 */
export const useAccountsSubscribe = () => {
  const [accounts, setAccounts] = useState<AccountJson[]>()
  useEffect(() => {
    const unsubscribe = api.accountsSubscribe(setAccounts)
    return () => unsubscribe()
  }, [])

  return accounts
}
