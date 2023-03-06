import { db } from "@core/db"
import { EvmWalletTransaction, WalletTransaction } from "@core/domains/recentTransactions/types"
import { IconButton } from "@talisman/components/IconButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { PendingTransactionsIcon } from "@talisman/theme/icons"
import { Balance } from "@talismn/balances"
import { useLiveQuery } from "dexie-react-hooks"
import { FC } from "react"
import { Button, Drawer } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"

const TransactionRowEvm: FC<{ transaction: EvmWalletTransaction }> = ({ transaction }) => {
  return (
    <div className="flex w-full grow items-center">
      <ChainLogo id={transaction.evmNetworkId} />
      <div className="flex grow flex-col">
        <div>
          <div>Sending</div>
          <div>-420.69 GLMR</div>
        </div>
        <div>
          <div>To: 0xc3h..d3ieE</div>
          <div>$179.55</div>
        </div>
      </div>
    </div>
  )
}

const TransactionRow: FC<{ transaction: WalletTransaction }> = ({ transaction }) => {
  switch (transaction.networkType) {
    case "evm":
      return <TransactionRowEvm transaction={transaction} />
    default:
      return null
  }
}

const TransactionsList: FC<{
  transactions?: WalletTransaction[]
}> = ({ transactions }) => {
  return (
    <div>
      {transactions?.map((tx) => (
        <div></div>
      ))}
    </div>
  )
}

export const PendingTransactionsButton = () => {
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const { isOpen, open, close } = useOpenClose()

  // console.log({ transactions })

  return (
    <>
      <IconButton onClick={open}>
        <PendingTransactionsIcon />
      </IconButton>
      <Drawer anchor="bottom" isOpen={isOpen} onDismiss={close} containerId="main">
        <div className="bg-grey-800 scrollable rounded-t-xl">
          <div className="flex flex-col gap-12 p-12">
            <div className="text-md text-body mb-3 font-bold">Pending transactions</div>
            <TransactionsList transactions={transactions} />
            <Button className="w-full">Close</Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
