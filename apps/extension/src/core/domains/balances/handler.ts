import type { BalancesResult, IBalance } from "@talismn/balances"
import { getSharedObservable } from "@talismn/util"
import { fromPairs } from "lodash-es"
import { filter, firstValueFrom, map, type Observable, of } from "rxjs"

import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { balancesProvider } from "./balancesProvider"
import type {
  BalanceSubscriptionResponse,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
} from "./types"
import { walletBalances$ } from "./walletBalances"

export class BalancesHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // balances handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return getBalance(request as RequestBalance)

      case "pri(balances.subscribe)":
        return genericSubscription(id, port, walletBalances$, toPortResult)

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)":
        return genericSubscription(
          id,
          port,
          getBalancesByParams$(request as RequestBalancesByParamsSubscribe),
          toPortResult
        )

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

// confirmedBalanceIds is every address times every active token and the UI reads none of
// it, so it stays on the background side of the port
const toPortResult = (result: BalancesResult): BalanceSubscriptionResponse => ({
  ...result,
  confirmedBalanceIds: [],
})

const getBalance = ({ address, tokenId }: RequestBalance) => {
  return firstValueFrom(
    balancesProvider.getBalances$({ [tokenId]: [address] }).pipe(
      filter((res) => res.status === "live"),
      map((res): IBalance | null => res.balances[0] ?? null)
    )
  )
}

const getBalancesByParams$ = (
  params: RequestBalancesByParamsSubscribe
): Observable<BalanceSubscriptionResponse> => {
  return getSharedObservable(
    "getBalancesByParams$",
    params,
    (): Observable<BalanceSubscriptionResponse> => {
      const { addressesAndTokens } = params

      // if no addresses, return early
      if (!addressesAndTokens.addresses.length || !addressesAndTokens.tokenIds.length)
        return of<BalanceSubscriptionResponse>({
          balances: [],
          status: "live",
          failedBalanceIds: [],
          confirmedBalanceIds: [],
        })

      const addressesByTokenId = fromPairs(
        addressesAndTokens.tokenIds.map(
          (tokenId) => [tokenId, addressesAndTokens.addresses] as [string, string[]]
        )
      )

      return balancesProvider.getBalances$(addressesByTokenId)
    }
  )
}
