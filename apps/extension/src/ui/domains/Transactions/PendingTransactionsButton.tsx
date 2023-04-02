import { db } from "@core/db"
import { IconButton } from "@talisman/components/IconButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ClockIcon, PendingTransactionsIcon } from "@talisman/theme/icons"
import { NavIconHistory } from "@ui/apps/popup/components/Navigation/icons"
import { useLiveQuery } from "dexie-react-hooks"
import { useMemo } from "react"

import { PendingTransactionsDrawer } from "./PendingTransactionsDrawer"

export const PendingTransactionsButton = () => {
  const transactions = useLiveQuery(() => db.transactions.reverse().sortBy("timestamp"), [])
  const hasPendingTransactions = useMemo(
    () => transactions?.some((t) => t.status === "pending"),
    [transactions]
  )
  const { isOpen, open, close } = useOpenClose()

  if (!transactions?.length) return null

  return (
    <div className="flex flex-col justify-center">
      <IconButton onClick={open}>
        {hasPendingTransactions ? <PendingTransactionsIcon /> : <ClockIcon />}
      </IconButton>
      <PendingTransactionsDrawer isOpen={isOpen} onClose={close} transactions={transactions} />
    </div>
  )
}
