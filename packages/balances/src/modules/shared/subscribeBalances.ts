import type { IChainConnectorDot } from "@talismn/chain-connectors"
import type { DotNetworkId, TokenType } from "@talismn/chaindata-provider"
import { reportJsActivity, yieldToEventLoop } from "@talismn/util"
import { defer, distinctUntilChanged, map, Observable, of, switchMap } from "rxjs"

import log from "../../log"
import type { IBalance } from "../../types/balancetypes"
import { isEqualModuleResults } from "../../types/fingerprint"
import type {
  FetchBalanceResults,
  IBalanceModule,
  TokensWithAddresses,
} from "../../types/IBalanceModule"
import type { MiniMetadata } from "../../types/minimetadatas"
import { getRpcQueryPack$, type RpcQueryPack } from "./rpcQueryPack"
import { type BalanceDef, getBalanceDefs } from "./types"

const POLLING_INTERVAL = 6_000

/** subscribes by calling fetchBalances every 6 seconds */
export const createPollingSubscribeBalances =
  <T extends TokenType, TC, MC, MX>(
    moduleType: T,
    fetchBalances: IBalanceModule<T, TC, MC, MX>["fetchBalances"]
  ): IBalanceModule<T, TC, MC, MX>["subscribeBalances"] =>
  (args) => {
    const { networkId, tokensWithAddresses } = args
    if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

    return new Observable<FetchBalanceResults>((subscriber) => {
      const abortController = new AbortController()

      const poll = async () => {
        try {
          if (abortController.signal.aborted) return

          const balances = await fetchBalances(args as Parameters<typeof fetchBalances>[0])

          if (abortController.signal.aborted) return

          // poll-completion marker: fires even when the dedup gate below suppresses the
          // emission, so stall watchdogs can attribute the poll's fetch/decode compute
          reportJsActivity(`poll ${moduleType} ${networkId} (${balances.success.length})`)

          subscriber.next(balances)

          setTimeout(poll, POLLING_INTERVAL)
        } catch (error) {
          log.error("Error", { module: moduleType, networkId, tokensWithAddresses, error })
          subscriber.error(error)
        }
      }

      poll()

      return () => {
        abortController.abort()
      }
    }).pipe(distinctUntilChanged(isEqualModuleResults))
  }

/** subscribes to the storage entries returned by buildQueries */
export const createRpcQuerySubscribeBalances =
  <T extends TokenType, TC = unknown, MC = unknown, MX = unknown>(
    buildQueries: (
      networkId: string,
      balanceDefs: BalanceDef<T>[],
      miniMetadata: MiniMetadata<MX>
    ) => RpcQueryPack<IBalance>[]
  ): IBalanceModule<T, TC, MC, MX>["subscribeBalances"] =>
  (args) => {
    const { networkId, tokensWithAddresses, connector, miniMetadata } = args as {
      networkId: DotNetworkId
      tokensWithAddresses: TokensWithAddresses
      connector: IChainConnectorDot
      miniMetadata: MiniMetadata<MX>
    }
    if (!tokensWithAddresses.length) return of({ success: [], errors: [] })

    const balanceDefs = getBalanceDefs<T>(tokensWithAddresses)

    return defer(async () => {
      // on a scale-builder cache miss, query building parses/builds the chain metadata
      // (expensive, indivisible) — give it its own macrotask so it doesn't stack with
      // the current tick's other work
      await yieldToEventLoop()
      return buildQueries(networkId, balanceDefs, miniMetadata)
    }).pipe(
      switchMap((queries) => getRpcQueryPack$(connector, networkId, queries)),
      map((balances) => ({
        success: balances,
        errors: [],
      }))
    )
  }
