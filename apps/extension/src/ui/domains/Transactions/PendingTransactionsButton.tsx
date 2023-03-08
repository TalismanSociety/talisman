import { db } from "@core/db"
import { IconButton } from "@talisman/components/IconButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { PendingTransactionsIcon } from "@talisman/theme/icons"
import { useLiveQuery } from "dexie-react-hooks"

import { PendingTransactionsDrawer } from "./PendingTransactionsDrawer"

export const PendingTransactionsButton = () => {
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const { isOpen, open, close } = useOpenClose()

  return (
    <div>
      <IconButton onClick={open} className={transactions?.length ? "visible" : "invisible"}>
        <PendingTransactionsIcon />
      </IconButton>
      <PendingTransactionsDrawer isOpen={isOpen} onClose={close} transactions={transactions} />
    </div>
  )
}
