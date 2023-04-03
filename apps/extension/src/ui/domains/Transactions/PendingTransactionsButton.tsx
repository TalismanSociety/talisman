import { db } from "@core/db"
import { IconButton } from "@talisman/components/IconButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ClockIcon, PendingTransactionsIcon } from "@talisman/theme/icons"
import { useLiveQuery } from "dexie-react-hooks"

import { PendingTransactionsDrawer } from "./PendingTransactionsDrawer"

export const PendingTransactionsButton = () => {
  const hasPendingTransactions = useLiveQuery(
    async () => !!(await db.transactions.where("status").equals("pending").count()),
    []
  )
  const { isOpen, open, close } = useOpenClose()

  return (
    <div className="flex flex-col justify-center">
      <IconButton onClick={open}>
        {hasPendingTransactions ? <PendingTransactionsIcon /> : <ClockIcon />}
      </IconButton>
      <PendingTransactionsDrawer isOpen={isOpen} onClose={close} />
    </div>
  )
}
