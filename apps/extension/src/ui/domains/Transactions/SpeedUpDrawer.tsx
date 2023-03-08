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
    <Drawer
      isOpen={!!isOpen}
      anchor="bottom"
      containerId="main"
      onDismiss={onClose}
      className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12"
    >
      <RocketIcon className="text-primary text-[40px]" />
      <div className="text-base font-bold">Speed Up Transaction</div>
      <div className="text-body-secondary text-sm">
        This will attempt to speed up your pending transaction by resubmitting it with a higher
        priority
      </div>
      <div className="h-24"></div>
      <div className="grid h-24 w-full grid-cols-2 gap-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button primary>Speed Up</Button>
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
