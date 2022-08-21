import {
  AddressesByToken,
  BalanceJson,
  BalanceModule,
  Balances,
  balances as balancesFn,
} from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import { ChaindataProvider, Token } from "@talismn/chaindata-provider"
import { Dexie } from "dexie"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useState } from "react"
import { useDebounce } from "react-use"

import log from "../log"
import { useChains, useEvmNetworks, useTokens } from "./useChaindata"

export function useBalances(
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<BalanceModule<any, any, any, any>>,
  chaindataProvider: ChaindataProvider | null,
  addressesByToken: AddressesByToken<Token> | null
) {
  const chainConnector = useChainConnector(chaindataProvider)

  useEffect(() => {
    if (chainConnector === null) return
    if (chaindataProvider === null) return
    if (addressesByToken === null) return
    const unsubscribePromises = balanceModules.map((balanceModule) =>
      balancesFn(
        balanceModule,
        chainConnector,
        chaindataProvider,
        addressesByToken,
        (error, balances) => {
          if (error) return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
          if (!balances) return

          db.transaction("rw", db.balances, async () => {
            await db.balances.bulkPut(
              Object.entries(balances.toJSON()).map(([id, balance]) => ({ id, ...balance }))
            )
          })
        }
      )
    )

    // TODO: Set balances status to cache on unmount
    return () => {
      unsubscribePromises.forEach((unsubscribePromise) =>
        unsubscribePromise.then((unsub) => unsub())
      )
    }
  }, [addressesByToken, chainConnector])

  const chains = useChains(chaindataProvider)
  const evmNetworks = useEvmNetworks(chaindataProvider)
  const tokens = useTokens(chaindataProvider)
  const balances = useLiveQuery(
    async () => new Balances(await db.balances.toArray(), { chains, evmNetworks, tokens }),
    [chains, evmNetworks, tokens]
  )

  // debounce every 100ms to prevent hammering UI with updates
  const [debouncedBalances, setDebouncedBalances] = useState<Balances | undefined>(balances)
  useDebounce(() => balances && setDebouncedBalances(balances), 100, [balances])

  return debouncedBalances
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
