import { bind } from "@react-rxjs/core"
import { liveQuery } from "dexie"
import { db } from "extension-core"
import { from, map } from "rxjs"
import { Hex } from "viem"

import { debugObservable } from "./util/debugObservable"

export const [useTransactions, transactions$] = bind(
  from(liveQuery(() => db.transactions.toArray())).pipe(
    map((txs) => txs.sort((tx1, tx2) => tx2.timestamp - tx1.timestamp)),
    debugObservable("transactions$"),
  ),
)

export const [useTransaction, getTransaction$] = bind((hash?: Hex) =>
  from(
    liveQuery(async () => {
      if (!hash) return undefined
      return (await db.transactions.get(hash)) ?? null
    }),
  ),
)
