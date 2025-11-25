import { bind } from "@react-rxjs/core"
import { Loadable } from "@talismn/util"
import { BittensorValidator } from "extension-core"
import { keyBy, uniq } from "lodash-es"
import { map, Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { getTokens$ } from "./chaindata"
import { debugObservable } from "./util/debugObservable"

const bittensorValidatorsRaw$ = new Observable<Loadable<BittensorValidator[]>>((subscriber) => {
  const unsubscribe = api.bittensorValidatorsSubscribe((data) => {
    subscriber.next(data)
  })

  return () => {
    unsubscribe()
  }
}).pipe(
  debugObservable("bittensorValidatorsRaw$", true),
  shareReplay({ bufferSize: 1, refCount: true }),
)

export const [useBittensorValidators, bittensorValidators$] = bind(bittensorValidatorsRaw$, {
  status: "loading",
  data: [],
})

export const [useBittensorValidatorsMap, bittensorValidatorsMap$] = bind(
  bittensorValidatorsRaw$.pipe(
    map((loadable) => ({
      status: loadable.status,
      data: keyBy(loadable.data ?? [], (v) => v.hotkey.ss58),
    })),
  ),
  { status: "loading", data: {} },
)

export const [useBittensorValidator, getBittensorValidator$] = bind(
  (address: string | null | undefined) =>
    bittensorValidatorsMap$.pipe(
      map((loadable) => {
        if (!address)
          return { status: loadable.status, data: null } as Loadable<BittensorValidator | null>
        return {
          status: loadable.status,
          data: loadable.data[address] ?? null,
        } as Loadable<BittensorValidator | null>
      }),
    ),
  { status: "loading", data: null },
)

export const [useBittensorNetworkIds, bittensorNetworkIds$] = bind(
  getTokens$({ platform: "polkadot" }).pipe(
    map((tokens) =>
      uniq(
        tokens
          .filter((t) => t.type === "substrate-dtao" && t.networkId === "bittensor") // TODO: remove networkId check once testnets work
          .map((t) => t.networkId),
      ),
    ),
  ),
  [],
)

export const [useIsBittensorNetwork, isBittensorNetwork$] = bind(
  (networkId: string | null | undefined) =>
    bittensorNetworkIds$.pipe(
      map((networkIds) => (networkId ? networkIds.includes(networkId) : false)),
    ),
  false,
)
