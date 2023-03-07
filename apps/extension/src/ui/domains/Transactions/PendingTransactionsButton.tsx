import { db } from "@core/db"
import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
import { Menu } from "@headlessui/react"
import { IconButton } from "@talisman/components/IconButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import {
  LoaderIcon,
  MoreHorizontalIcon,
  PendingTransactionsIcon,
  RocketIcon,
  XOctagonIcon,
} from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { useLiveQuery } from "dexie-react-hooks"
import { BigNumber } from "ethers"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button, Drawer } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"

type TransactionRowPropsEvm = {
  tx: EvmWalletTransaction
  enabled: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
}

type TransactionRowPropsSub = {
  tx: SubWalletTransaction
  enabled: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
}

type TransactionRowProps = {
  tx: WalletTransaction
  enabled: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
}

const ActionButton = ({ children }: { children: React.ReactNode }) => {
  return (
    <button
      type="button"
      className="hover:bg-grey-700 text-body-secondary hover:text-body inline-block h-[36px] w-[36px] shrink-0 rounded-sm text-center"
    >
      {children}
    </button>
  )
}

const OpenBroadcast: FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({
  open,
  onOpenChange,
}) => {
  useEffect(() => {
    onOpenChange(open)
  }, [onOpenChange, open])
  return null
}

const TransactionRowEvm: FC<TransactionRowPropsEvm> = ({
  tx,
  enabled,
  onContextMenuOpen,
  onContextMenuClose,
}) => {
  const { to, value } = tx.unsigned
  const evmNetwork = useEvmNetwork(tx.evmNetworkId)
  const token = useToken(evmNetwork?.nativeToken?.id)
  const tokenRates = useTokenRates(evmNetwork?.nativeToken?.id)

  const amount = useMemo(
    () =>
      token && value
        ? new BalanceFormatter(BigNumber.from(value).toBigInt(), token.decimals, tokenRates)
        : null,
    [token, tokenRates, value]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onContextMenuOpen?.()
      else onContextMenuClose?.()
    },
    [onContextMenuClose, onContextMenuOpen]
  )

  return (
    <Menu>
      {({ open }) => (
        <div
          className={classNames(
            " group z-0 flex h-[45px] w-full grow items-center gap-4 rounded-sm px-4",
            open && "bg-grey-750",
            enabled && "hover:bg-grey-750"
          )}
        >
          <OpenBroadcast open={open} onOpenChange={handleOpenChange} />
          <ChainLogo id={tx.evmNetworkId} className="shrink-0 text-xl" />
          <div className="leading-paragraph relative flex w-full grow justify-between">
            <div className="text-left">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span>Sending </span>
                {<LoaderIcon className="animate-spin-slow" />}
              </div>
              <div className="text-body-secondary text-xs">
                To: {to ? shortenAddress(to) : "unknown"}
              </div>
            </div>
            <div className="relative grow text-right">
              {amount && token && (
                <div
                  className={classNames(
                    open ? "opacity-0" : "opacity-100",
                    enabled && "group-hover:opacity-0"
                  )}
                >
                  <div className="text-sm">
                    <Tokens
                      amount={amount.tokens}
                      decimals={token.decimals}
                      noCountUp
                      symbol={token.symbol}
                    />
                  </div>
                  <div className="text-body-secondary text-xs">
                    {amount.fiat("usd") && (
                      <Fiat amount={amount.fiat("usd")} currency="usd" noCountUp />
                    )}
                  </div>
                </div>
              )}
              <div
                className={classNames(
                  " absolute top-0 right-0 z-10 flex h-[36px] items-center",
                  open ? "visible opacity-100" : "invisible opacity-0",
                  enabled && "group-hover:visible group-hover:opacity-100"
                )}
              >
                <div className="relative">
                  <ActionButton>
                    <RocketIcon className="inline" />
                  </ActionButton>
                  <ActionButton>
                    <XOctagonIcon className="inline" />
                  </ActionButton>
                  <Menu.Button className="hover:bg-grey-700 text-body-secondary hover:text-body inline-block h-[36px] w-[36px] shrink-0 rounded-sm text-center">
                    <MoreHorizontalIcon className="inline" />
                  </Menu.Button>
                  <Menu.Items
                    className={classNames(
                      "absolute right-0 z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                    )}
                  >
                    <div className="border-grey-800 flex flex-col  whitespace-nowrap rounded-sm bg-black px-2 py-3 shadow-xl">
                      <Menu.Item>
                        <button className="hover:bg-grey-800 rounded-xs h-20 p-6">
                          Cancel transaction
                        </button>
                      </Menu.Item>
                      <Menu.Item>
                        <button className="hover:bg-grey-800 rounded-xs h-20 p-6">
                          Speed up transaction
                        </button>
                      </Menu.Item>
                      <Menu.Item>
                        <button className="hover:bg-grey-800 rounded-xs h-20 p-6">
                          View on block explorer
                        </button>
                      </Menu.Item>
                      <Menu.Item>
                        <button className="hover:bg-grey-800 rounded-xs h-20 p-6">Dismiss</button>
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Menu>
  )
}

const TransactionRow: FC<TransactionRowProps> = ({ tx, ...props }) => {
  switch (tx.networkType) {
    case "evm":
      return <TransactionRowEvm tx={tx} {...props} />
    default:
      return null
  }
}

const TransactionsList: FC<{
  transactions?: WalletTransaction[]
}> = ({ transactions }) => {
  // because of the context menu, we need to control at this level which row shows buttons
  const [activeTxHash, setActiveTxHash] = useState<string>()

  const handleContextMenuOpen = useCallback(
    (hash: string) => () => {
      if (!activeTxHash) setActiveTxHash(hash)
    },
    [activeTxHash]
  )

  const handleContextMenuClose = useCallback(
    (hash: string) => () => {
      if (hash === activeTxHash) setActiveTxHash(undefined)
    },
    [activeTxHash]
  )

  return (
    <div className="space-y-8">
      {transactions?.map((tx) => (
        <TransactionRow
          key={tx.hash}
          tx={tx}
          enabled={!activeTxHash || activeTxHash === tx.hash}
          onContextMenuOpen={handleContextMenuOpen(tx.hash)}
          onContextMenuClose={handleContextMenuClose(tx.hash)}
        />
      ))}
    </div>
  )
}

export const PendingTransactionsButton = () => {
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const { isOpen, open, close } = useOpenClose(true) // TODO remove true

  // useEffect(() => {
  //   console.log({ transactions })
  // }, [transactions])

  return (
    <>
      <IconButton onClick={open}>
        <PendingTransactionsIcon />
      </IconButton>
      <Drawer anchor="bottom" isOpen={isOpen} onDismiss={close} containerId="main">
        <div className="bg-grey-800 scrollable rounded-t-xl">
          <div className="flex flex-col gap-12 p-12">
            <div className="text-md text-body flex items-center gap-4 font-bold">
              <span>Pending transactions </span>
              <span className="bg-grey-700 text-body-secondary inline-flex h-12 w-12 flex-col items-center justify-center rounded-full text-xs">
                <span>{transactions?.length ?? 0}</span>
              </span>
            </div>
            <TransactionsList transactions={transactions} />
            <Button className="w-full">Close</Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
