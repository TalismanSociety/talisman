import { db } from "@core/db"
import { IconButton } from "@talisman/components/IconButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { PendingTransactionsIcon } from "@talisman/theme/icons"
import { useLiveQuery } from "dexie-react-hooks"
import React, { FC } from "react"

import { PendingTransactionsDrawer } from "./PendingTransactionsDrawer"

// memo to prevent rerenders when balances update, which would reset animation
const Button: FC<{ open: () => void }> = React.memo(({ open }) => {
  return (
    <IconButton onClick={open}>
      <PendingTransactionsIcon />
    </IconButton>
  )
})

export const PendingTransactionsButton = () => {
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const { isOpen, open, close } = useOpenClose()

  if (!transactions?.length) return null

  return (
    <div>
      <Button open={open} />
      <PendingTransactionsDrawer isOpen={isOpen} onClose={close} transactions={transactions} />
    </div>
  )
}
