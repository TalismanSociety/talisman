import type { AddressesAndTokens, BalanceSubscriptionResponse } from "@core/domains/balances/types"
import { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { useMessageSubscription } from "@ui/hooks/useMessageSubscription"
import { useBalancesHydrate } from "@ui/state/balances"
import md5 from "blueimp-md5"
import { useCallback, useMemo, useState } from "react"
import { useDebounce } from "react-use"
import type { BehaviorSubject } from "rxjs"

const INITIAL_VALUE: BalanceSubscriptionResponse = {
  status: "initialising",
  balances: [],
  failedBalanceIds: [],
}

const DEFAULT_TOKENS_AND_ADDRESSES: AddressesAndTokens = { addresses: [], tokenIds: [] }

// TODO merge addressesByChain and addressesandNetworks into a single addressesByNetwork object, or just remove both
export type BalancesByParamsProps = {
  addressesAndTokens?: AddressesAndTokens
}

// This is used to fetch balances from accounts that are not in the keyring
export const useBalancesByParams = ({
  addressesAndTokens = DEFAULT_TOKENS_AND_ADDRESSES,
}: BalancesByParamsProps) => {
  const hydrate = useBalancesHydrate()

  const subscribe = useCallback(
    (subject: BehaviorSubject<BalanceSubscriptionResponse>) => {
      return api.balancesByParams(addressesAndTokens, (update) => subject.next(update))
    },
    [addressesAndTokens]
  )

  // subscription must be reinitialized (using the key) if parameters change
  const subscriptionKey = useMemo(
    () => `useBalancesByParams-${md5(JSON.stringify(addressesAndTokens))}`,
    [addressesAndTokens]
  )

  const data = useMessageSubscription(subscriptionKey, INITIAL_VALUE, subscribe)

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<BalanceSubscriptionResponse>(
    () => data
  )
  useDebounce(() => setDebouncedBalances(data), 100, [data])

  return useMemo(
    () => ({
      status: debouncedBalances.status,
      balances: new Balances(debouncedBalances.balances, hydrate),
    }),
    [debouncedBalances, hydrate]
  )
}

type UseBalanceByParams = {
  address: string | null | undefined
  tokenId: TokenId | null | undefined
}

export const useBalanceByParams = ({ address, tokenId }: UseBalanceByParams) => {
  const { balances } = useBalancesByParams({
    addressesAndTokens: {
      addresses: address ? [address] : [],
      tokenIds: tokenId ? [tokenId] : [],
    },
  })

  return useMemo(() => {
    if (!address || !tokenId) return null
    return balances.find({ address, tokenId }).each[0] ?? null
  }, [balances, address, tokenId])
}
