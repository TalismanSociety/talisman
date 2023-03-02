import { db } from "@core/db"
import { IconButton } from "@talisman/components/IconButton"
import { PendingTransactionsIcon } from "@talisman/theme/icons"
import { Balance } from "@talismn/balances"
import { useLiveQuery } from "dexie-react-hooks"

export const PendingTransactionsButton = () => {
  const requests = useLiveQuery(() => db.transactions.toArray(), [])
  const b = {} as unknown as Balance

  return (
    <>
      <IconButton>
        <PendingTransactionsIcon />
      </IconButton>
    </>
  )
}
