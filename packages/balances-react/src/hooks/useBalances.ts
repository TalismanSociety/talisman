import {
  AddressesByToken,
  BalanceModule,
  Balances,
  balances as balancesFn,
} from "@talismn/balances"
import { db } from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChaindataProvider, Token } from "@talismn/chaindata-provider"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useState } from "react"
import { useDebounce } from "react-use"

import log from "../log"
import { useChains, useEvmNetworks, useTokens } from "./useChaindata"
import { useTokenRates } from "./useTokenRates"

export type Options = {
  onfinalityApiKey?: string
}

// TODO: Add the equivalent functionalty of `useDbCache` directly to this library.
//
//       How it will work:
//
//       useChains/useEvmNetworks/useTokens/useTokenRates will all make use of a
//       useCachedDb hook, which internally subscribes to all of the db tables
//       for everything, and then filters the subscribed data based on what params
//       the caller of useChains/useTokens/etc has provided.
export function useBalances(
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<BalanceModule<any, any, any, any>>,
  chaindataProvider: ChaindataProvider | null,
  addressesByToken: AddressesByToken<Token> | null,
  options: Options = {}
) {
  useBalancesSubscriptions(balanceModules, chaindataProvider, addressesByToken, options)

  const chains = useChains(chaindataProvider)
  const evmNetworks = useEvmNetworks(chaindataProvider)
  const tokens = useTokens(chaindataProvider)
  const tokenRates = useTokenRates(tokens)
  const balances = useLiveQuery(
    async () =>
      new Balances(
        await db.balances
          .filter((balance) => {
            // check that this balance is included in our queried balance modules
            if (!balanceModules.map(({ type }) => type).includes(balance.source)) return false

            // check that our query includes some tokens and addresses
            if (!addressesByToken) return false

            // check that this balance is included in our queried tokens
            if (!Object.keys(addressesByToken).includes(balance.tokenId)) return false

            // check that this balance is included in our queried addresses for this token
            if (!addressesByToken[balance.tokenId].includes(balance.address)) return false

            // keep this balance
            return true
          })
          .toArray(),

        // hydrate balance chains, evmNetworks, tokens and tokenRates
        { chains, evmNetworks, tokens, tokenRates }
      ),
    [balanceModules, addressesByToken, chains, evmNetworks, tokens, tokenRates]
  )

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<Balances | undefined>(balances)
  useDebounce(() => balances && setDebouncedBalances(balances), 100, [balances])

  return debouncedBalances
}

// TODO: Turn into react context
const subscriptions: Record<
  string,
  { unsub: Promise<() => void>; refcount: number; generation: number }
> = {}

// This hook is responsible for allowing us to call useBalances
// from multiple components, without setting up unnecessary
// balance subscriptions
function useBalancesSubscriptions(
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<BalanceModule<any, any, any, any>>,
  chaindataProvider: ChaindataProvider | null,
  addressesByToken: AddressesByToken<Token> | null,
  options: Options = {}
) {
  // const subscriptions = useRef<
  //   Record<string, { unsub: Promise<() => void>; refcount: number; generation: number }>
  // >({})

  const addSubscription = (
    key: string,
    balanceModule: BalanceModule<any, any, any, any>,
    chainConnectors: { substrate?: ChainConnector; evm?: ChainConnectorEvm },
    chaindataProvider: ChaindataProvider,
    addressesByToken: AddressesByToken<Token>
  ) => {
    // create subscription if it doesn't already exist
    if (!subscriptions[key] || subscriptions[key].refcount === 0) {
      const generation = ((subscriptions[key]?.generation || 0) + 1) % Number.MAX_SAFE_INTEGER

      const unsub = balancesFn(
        balanceModule,
        chainConnectors,
        chaindataProvider,
        addressesByToken,
        (error, balances) => {
          if (error) return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
          if (!balances) return

          // ignore balances from old subscriptions which are still in the process of unsubscribing
          if (subscriptions[key].generation !== generation) return

          const putBalances = Object.entries(balances.toJSON()).map(([id, balance]) => ({
            id,
            ...balance,
          }))
          db.transaction("rw", db.balances, async () => await db.balances.bulkPut(putBalances))
        }
      )
      subscriptions[key] = { unsub, refcount: 0, generation }
    }

    // bump up the refcount by 1
    subscriptions[key].refcount += 1
  }
  const removeSubscription = (
    key: string,
    balanceModule: BalanceModule<any, any, any, any>,
    addressesByToken: AddressesByToken<Token>
  ) => {
    // ignore dead subscriptions
    if (!subscriptions[key] || subscriptions[key].refcount === 0) return

    // drop the refcount by one
    subscriptions[key].refcount -= 1

    // unsubscribe if refcount is now 0 (nobody wants this subcription anymore)
    if (subscriptions[key].refcount < 1) {
      // remove subscription
      subscriptions[key].unsub.then((unsub) => unsub())
      delete subscriptions[key]

      // set this subscription's balances in the store to status: cache
      db.transaction(
        "rw",
        db.balances,
        async () =>
          await db.balances
            .filter((balance) => {
              if (balance.source !== balanceModule.type) return false
              if (!Object.keys(addressesByToken).includes(balance.tokenId)) return false
              if (!addressesByToken[balance.tokenId].includes(balance.address)) return false
              return true
            })
            .modify({ status: "cache" })
      )
    }
  }

  const chainConnector = useChainConnector(chaindataProvider)
  const chainConnectorEvm = useChainConnectorEvm(chaindataProvider, options)
  const tokens = useTokens(chaindataProvider)
  useEffect(() => {
    if (chainConnector === null) return
    if (chainConnectorEvm === null) return
    if (chaindataProvider === null) return
    if (addressesByToken === null) return

    const unsubs = balanceModules.map((balanceModule) => {
      const subscriptionKey = `${balanceModule.type}-${JSON.stringify(addressesByToken)}`

      // filter out tokens to only include those which this module knows how to fetch balances for
      const moduleTokenIds = Object.values(tokens)
        .filter(({ type }) => type === balanceModule.type)
        .map(({ id }) => id)
      const addressesByModuleToken = Object.fromEntries(
        Object.entries(addressesByToken).filter(([tokenId]) => moduleTokenIds.includes(tokenId))
      )

      // add balance subscription for this module
      addSubscription(
        subscriptionKey,
        balanceModule,
        { substrate: chainConnector, evm: chainConnectorEvm },
        chaindataProvider,
        addressesByModuleToken
      )

      // return an unsub method, to be called when this effect unmounts
      return () => removeSubscription(subscriptionKey, balanceModule, addressesByToken)
    })
    const unsubAll = () => unsubs.forEach((unsub) => unsub())

    return unsubAll
  }, [
    addressesByToken,
    balanceModules,
    chainConnector,
    chainConnectorEvm,
    chaindataProvider,
    tokens,
  ])
}

// TODO: Allow advanced users of this library to provide their own chain connector
function useChainConnector(chaindataProvider: ChaindataProvider | null) {
  const [chainConnector, setChainConnector] = useState<ChainConnector | null>(null)
  useEffect(() => {
    if (chaindataProvider === null) return
    setChainConnector(new ChainConnector(chaindataProvider))
  }, [chaindataProvider])

  return chainConnector
}
// TODO: Allow advanced users of this library to provide their own chain connector
function useChainConnectorEvm(chaindataProvider: ChaindataProvider | null, options: Options = {}) {
  const [chainConnectorEvm, setChainConnectorEvm] = useState<ChainConnectorEvm | null>(null)
  useEffect(() => {
    if (chaindataProvider === null) return
    setChainConnectorEvm(
      new ChainConnectorEvm(chaindataProvider, { onfinalityApiKey: options.onfinalityApiKey })
    )
  }, [chaindataProvider, options.onfinalityApiKey])

  return chainConnectorEvm
}
