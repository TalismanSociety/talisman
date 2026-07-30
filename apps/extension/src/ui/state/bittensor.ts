import {
  BITTENSOR_NETWORK_ID,
  BITTENSOR_NETWORK_IDS,
  type BittensorValidator,
  isBittensorNetworkId,
} from "@core/domains/bittensor/exports"
import { bind } from "@react-rxjs/core"
import type { Loadable } from "@talismn/util"
import { api } from "@ui/api"
import { keyBy, uniq } from "lodash-es"
import { map, Observable, shareReplay } from "rxjs"

import { getTokens$ } from "./chaindata"
import { debugObservable } from "./util/debugObservable"

export { BITTENSOR_NETWORK_ID, BITTENSOR_NETWORK_IDS }

const bittensorValidatorsRaw$ = new Observable<Loadable<BittensorValidator[]>>((subscriber) => {
  const unsubscribe = api.bittensorValidatorsSubscribe((data) => {
    subscriber.next(data)
  })

  return () => {
    unsubscribe()
  }
}).pipe(
  debugObservable("bittensorValidatorsRaw$", true),
  shareReplay({ bufferSize: 1, refCount: true })
)

const [useBittensorValidators, _bittensorValidators$] = bind(bittensorValidatorsRaw$, {
  status: "loading",
  data: [],
})

const [useBittensorValidatorsMap, bittensorValidatorsMap$] = bind(
  bittensorValidatorsRaw$.pipe(
    map((loadable) => ({
      status: loadable.status,
      data: keyBy(loadable.data ?? [], (v) => v.hotkey),
    }))
  ),
  { status: "loading", data: {} }
)

const [useBittensorValidator, _getBittensorValidator$] = bind(
  (address: string | null | undefined) =>
    bittensorValidatorsMap$.pipe(
      map((loadable) => {
        if (!address)
          return { status: loadable.status, data: null } as Loadable<BittensorValidator | null>
        return {
          status: loadable.status,
          data: loadable.data[address] ?? null,
        } as Loadable<BittensorValidator | null>
      })
    ),
  { status: "loading", data: null }
)

const [useBittensorNetworkIds, bittensorNetworkIds$] = bind(
  getTokens$({ platform: "polkadot", activeOnly: true }).pipe(
    map((tokens) =>
      uniq(
        tokens
          .filter((t) => t.type === "substrate-dtao" && isBittensorNetworkId(t.networkId))
          .map((t) => t.networkId)
      )
    )
  ),
  []
)

const [_useIsBittensorNetwork, _isBittensorNetwork$] = bind(
  (networkId: string | null | undefined) =>
    bittensorNetworkIds$.pipe(
      map((networkIds) => (networkId ? networkIds.includes(networkId) : false))
    ),
  false
)

export {
  useBittensorNetworkIds,
  useBittensorValidator,
  useBittensorValidators,
  useBittensorValidatorsMap,
}
