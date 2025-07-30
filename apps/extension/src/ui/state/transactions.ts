import { bind } from "@react-rxjs/core"
import { liveQuery } from "dexie"
import { db } from "extension-core"
import { from, map } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const [useTransactions, transactions$] = bind(
  from(liveQuery(() => db.transactionsV2.toArray())).pipe(
    map((txs) => txs.sort((tx1, tx2) => tx2.timestamp - tx1.timestamp)),
    debugObservable("transactions$"),
  ),
)

export const [useTransaction, getTransaction$] = bind((id: string) =>
  from(
    liveQuery(async () => {
      if (!id) return undefined
      return (await db.transactionsV2.get(id)) ?? null
    }),
  ),
)
