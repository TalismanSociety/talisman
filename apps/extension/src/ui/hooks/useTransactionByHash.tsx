import { db } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { useLiveQuery } from "dexie-react-hooks"

const useTransactionByHash = (hash?: HexString) =>
  useLiveQuery(async () => {
    if (!hash) return undefined
    return (await db.transactions.get(hash)) ?? null
  }, [hash])

export default useTransactionByHash
