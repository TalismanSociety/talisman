import {
  AddressesByToken,
  BalanceJson,
  BalanceModule,
  Balances,
  balances as balancesFn,
} from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChaindataProvider, Token } from "@talismn/chaindata-provider"
import { Dexie } from "dexie"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useState } from "react"
import { useDebounce } from "react-use"

import log from "../log"
import { useChains, useEvmNetworks, useTokens } from "./useChaindata"
import { useTokenRates } from "./useTokenRates"

export function useBalances(
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<BalanceModule<any, any, any, any>>,
  chaindataProvider: ChaindataProvider | null,
  addressesByToken: AddressesByToken<Token> | null
) {
  useBalancesSubscriptions(balanceModules, chaindataProvider, addressesByToken)

  const chains = useChains(chaindataProvider)
  const evmNetworks = useEvmNetworks(chaindataProvider)
  const tokens = useTokens(chaindataProvider)
  const tokenRates = useTokenRates(tokens)
  const balances = useLiveQuery(
    async () =>
      new Balances(
        await db.balances
          .filter((balance) => {
            if (!balanceModules.map(({ type }) => type).includes(balance.source)) return false
            if (!addressesByToken) return false
            if (!Object.keys(addressesByToken).includes(balance.tokenId)) return false
            if (!addressesByToken[balance.tokenId].includes(balance.address)) return false
            return true
          })
          .toArray(),
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
  addressesByToken: AddressesByToken<Token> | null
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
  const chainConnectorEvm = useChainConnectorEvm()
  useEffect(() => {
    if (chainConnector === null) return
    if (chainConnectorEvm === null) return
    if (chaindataProvider === null) return
    if (addressesByToken === null) return

    const unsubs = balanceModules.map((balanceModule) => {
      const subscriptionKey = `${balanceModule.type}-${JSON.stringify(addressesByToken)}`

      // add balance subscription for this module
      addSubscription(
        subscriptionKey,
        balanceModule,
        { substrate: chainConnector, evm: chainConnectorEvm },
        chaindataProvider,
        addressesByToken
      )

      // return an unsub method, to be called when this effect unmounts
      return () => removeSubscription(subscriptionKey, balanceModule, addressesByToken)
    })
    const unsubAll = () => unsubs.forEach((unsub) => unsub())

    return unsubAll
  }, [addressesByToken, chainConnector, chainConnectorEvm])
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
function useChainConnectorEvm() {
  const [chainConnectorEvm, setChainConnectorEvm] = useState<ChainConnectorEvm | null>(null)
  useEffect(() => {
    setChainConnectorEvm(new ChainConnectorEvm())
  }, [])

  return chainConnectorEvm
}

export class BalancesDatabase extends Dexie {
  balances!: Dexie.Table<BalanceJson, string>

  constructor() {
    super("Balances")

    // https://dexie.org/docs/Tutorial/Design#database-versioning
    this.version(1).stores({
      // You only need to specify properties that you wish to index.
      // The object store will allow any properties on your stored objects but you can only query them by indexed properties
      // https://dexie.org/docs/API-Reference#declare-database
      //
      // Never index properties containing images, movies or large (huge) strings. Store them in IndexedDB, yes! but just don’t index them!
      // https://dexie.org/docs/Version/Version.stores()#warning
      balances: "id, source, status, address, tokenId",
    })
  }
}

const db = new BalancesDatabase()
