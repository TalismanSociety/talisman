import { IBalance } from "@talismn/balances"
import { parseTokenId } from "@talismn/chaindata-provider"
import { getSharedObservable } from "@talismn/util"
import { fromPairs } from "lodash-es"
import { filter, map, Observable, of, switchMap } from "rxjs"

import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { isAddressCompatibleWithNetwork } from "../accounts/helpers"
import { balancesProvider } from "./balancesProvider"
import {
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
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // balances handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return getBalance(request as RequestBalance)

      case "pri(balances.subscribe)":
        return genericSubscription(id, port, walletBalances$)

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)":
        return genericSubscription(
          id,
          port,
          getBalancesByParams$(request as RequestBalancesByParamsSubscribe),
        )

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

const getBalance = ({ address, tokenId }: RequestBalance) => {
  return balancesProvider.getBalances$({ [tokenId]: [address] }).pipe(
    filter((res) => res.status === "live"),
    map((res): IBalance | null => res.balances[0] ?? null),
  )
}

const getBalancesByParams$ = (
  params: RequestBalancesByParamsSubscribe,
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
        })

      const { tokenIds, addresses } = addressesAndTokens

      return chaindataProvider.getNetworksMapById$().pipe(
        map((networksMap) => {
          // check which addresses are compatible with which tokens,
          return fromPairs(
            tokenIds
              .map((tokenId) => {
                const network = networksMap[parseTokenId(tokenId).networkId]
                return [
                  tokenId,
                  addresses.filter(
                    (address) => !!network && isAddressCompatibleWithNetwork(network, address),
                  ),
                ] as [string, string[]]
              })
              .filter(([, addresses]) => addresses.length),
          )
        }),
        switchMap((addressesByTokenId) => balancesProvider.getBalances$(addressesByTokenId)),
      )
    },
  )
}
