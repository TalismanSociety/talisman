import { db } from "@core/db"
import { bind } from "@react-rxjs/core"
import { liveQuery } from "dexie"
import { from, map } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const [useTransactions, _transactions$] = bind(
  from(liveQuery(() => db.transactionsV2.toArray())).pipe(
    map((txs) => txs.sort((tx1, tx2) => tx2.timestamp - tx1.timestamp)),
    debugObservable("transactions$")
  )
)

const [useTransaction, _getTransaction$] = bind((id: string) =>
  from(
    liveQuery(async () => {
      if (!id) return undefined
      return (await db.transactionsV2.get(id)) ?? null
    })
  )
)

export { useTransaction, useTransactions }
