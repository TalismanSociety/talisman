import { db } from "@core/db"
import { EvmWalletTransaction, WalletTransaction } from "@core/domains/recentTransactions/types"
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
import { FC, useEffect, useMemo } from "react"
import { Button, Drawer } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"

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

const TransactionRowEvm: FC<{ transaction: EvmWalletTransaction }> = ({ transaction }) => {
  const { to, value } = transaction.unsigned
  const evmNetwork = useEvmNetwork(transaction.evmNetworkId)
  const token = useToken(evmNetwork?.nativeToken?.id)
  const tokenRates = useTokenRates(evmNetwork?.nativeToken?.id)

  const amount = useMemo(
    () =>
      token && value
        ? new BalanceFormatter(BigNumber.from(value).toBigInt(), token.decimals, tokenRates)
        : null,
    [token, tokenRates, value]
  )

  return (
    <Menu>
      {({ open }) => (
        <div className="hover:bg-grey-750 group z-0 flex h-[45px] w-full grow items-center gap-4 rounded-sm px-4">
          <ChainLogo id={transaction.evmNetworkId} className="shrink-0 text-xl" />
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
                  className={classNames(open ? "opacity-0" : "opacity-100 group-hover:opacity-0")}
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
                  "absolute top-0 right-0 z-10 flex h-[36px] items-center opacity-0 ",
                  open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
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
                  <Menu.Items className="absolute right-0 z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
    <div className="space-y-8">
      {transactions?.map((tx) => (
        <TransactionRow key={tx.hash} transaction={tx} />
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
