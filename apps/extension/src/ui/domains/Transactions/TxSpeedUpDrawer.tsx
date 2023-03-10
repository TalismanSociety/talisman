import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
import { RocketIcon } from "@talisman/theme/icons"
import { FC, useEffect, useState } from "react"
import { Button, Drawer } from "talisman-ui"

type TxSpeedUpDrawerProps = {
  tx?: WalletTransaction
  isOpen?: boolean
  onClose?: () => void
}

type EvmTxSpeedUpProps = TxSpeedUpDrawerProps & { tx: EvmWalletTransaction }
type SubTxSpeedUpProps = TxSpeedUpDrawerProps & { tx: SubWalletTransaction }

const TxSpeedUpEvm: FC<EvmTxSpeedUpProps> = ({ tx, isOpen, onClose }) => {
  // must render once before turning isOpen to true or transition won't happen
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(!!tx)

    return () => {
      setIsMounted(false)
    }
  }, [tx])

  return (
    <Drawer
      isOpen={isMounted && !!isOpen}
      anchor="bottom"
      containerId="main"
      onDismiss={onClose}
      className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12"
    >
      <RocketIcon className="text-primary text-[40px]" />
      <div className="mt-12 text-base font-bold">Speed Up Transaction</div>
      <p className="text-body-secondary mt-10 text-center text-sm">
        This will attempt to speed up your pending transaction by resubmitting it with a higher
        priority.
      </p>
      <div className="h-24"></div>
      <div className="grid w-full grid-cols-2 gap-4">
        <Button onClick={onClose} className="h-24">
          Cancel
        </Button>
        <Button primary className="h-24">
          Speed Up
        </Button>
      </div>
    </Drawer>
  )
}

export const TxSpeedUpDrawer: FC<TxSpeedUpDrawerProps> = ({ tx, ...props }) => {
  // tx needed to keep rendering after isOpen becomes false
  const [staleTx, setStaleTx] = useState<WalletTransaction>()
  useEffect(() => {
    if (tx) setStaleTx(tx)
  }, [tx])

  switch (staleTx?.networkType) {
    case "evm":
      return <TxSpeedUpEvm tx={staleTx} {...props} />
    default:
      return null
  }
}
