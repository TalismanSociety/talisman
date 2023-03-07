import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
import { RocketIcon } from "@talisman/theme/icons"
import { ethers } from "ethers"
import { FC, useMemo } from "react"
import { Button, Drawer } from "talisman-ui"

type SpeedUpDrawerProps = {
  tx?: WalletTransaction
  isOpen?: boolean
  onClose?: () => void
}

type EvmSpeedUpProps = SpeedUpDrawerProps & { tx: EvmWalletTransaction }
type SubSpeedUpProps = SpeedUpDrawerProps & { tx: SubWalletTransaction }

const SpeedUpEvm: FC<EvmSpeedUpProps> = ({ tx, isOpen, onClose }) => {
  return (
    <Drawer isOpen={!!isOpen} anchor="bottom" containerId="main" onDismiss={onClose}>
      <div className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl text-[40px]">
        <RocketIcon className="text-primary" />
        <div className="font-bold">Speed Up Transaction</div>
        <div className="text-body-secondary text-sm">
          This will attempt to speed up your pending transaction by resubmitting it with a higher
          priority
        </div>
        <div className="h-24"></div>
        <div className="grid h-24 grid-cols-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button primary>Speed Up</Button>
        </div>
      </div>
    </Drawer>
  )
}

export const SpeedUpDrawer: FC<SpeedUpDrawerProps> = ({ tx, ...props }) => {
  switch (tx?.networkType) {
    case "evm":
      return <SpeedUpEvm tx={tx} {...props} />
    default:
      return null
  }
}
