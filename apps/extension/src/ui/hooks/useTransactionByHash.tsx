import { db } from "@core/db"
import { HexString } from "@polkadot/util/types"
import { useLiveQuery } from "dexie-react-hooks"

const useTransactionByHash = (hash?: HexString) =>
  useLiveQuery(() => (hash ? db.transactions.get(hash) : undefined), [hash])

export default useTransactionByHash
