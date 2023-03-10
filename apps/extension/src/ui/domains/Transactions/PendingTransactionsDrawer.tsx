import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
import { TransactionStatus } from "@core/domains/recentTransactions/types"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { LoaderIcon, MoreHorizontalIcon, RocketIcon, XOctagonIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { BigNumber } from "ethers"
import sortBy from "lodash/sortBy"
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button, Drawer, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { Popover, PopoverContent, PopoverTrigger } from "talisman-ui"
import urlJoin from "url-join"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"
import { TxCancelDrawer } from "./TxCancelDrawer"
import { TxSpeedUpDrawer } from "./TxSpeedUpDrawer"

type TransactionRowProps = {
  tx: WalletTransaction
  enabled: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
}

type TransactionRowPropsEvm = TransactionRowProps & { tx: EvmWalletTransaction }
type TransactionRowPropsSub = TransactionRowProps & { tx: SubWalletTransaction }

const ActionButton = forwardRef<
  HTMLButtonElement,
  React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
>(({ type = "button", className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={classNames(
        "hover:bg-grey-700 text-body-secondary hover:text-body inline-block h-[36px] w-[36px] shrink-0 rounded-sm text-center",
        className
      )}
      {...props}
    />
  )
})

// this context menu prevents drawer animation to slide up correctly, render when it's finished
const EvmTxActions: FC<{
  tx: EvmWalletTransaction
  enabled: boolean
  isOpen: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
}> = ({
  tx,
  enabled,
  isOpen, // controlled because we must prevent other rows to get in hover state if our context menu is open
  onContextMenuOpen,
  onContextMenuClose,
}) => {
  const isPending = useMemo(() => ["pending", "unknown"].includes(tx?.status), [tx.status])
  const ocSpeedUp = useOpenClose()
  const ocCancelUp = useOpenClose()

  const handleActionClick = useCallback(
    (action: TransactionAction) => () => {
      onContextMenuClose?.()
      if (action === "speed-up") ocSpeedUp.open()
      if (action === "cancel") ocCancelUp.open()
    },
    [ocCancelUp, ocSpeedUp, onContextMenuClose]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onContextMenuOpen?.()
      else onContextMenuClose?.()
    },
    [onContextMenuClose, onContextMenuOpen]
  )

  const evmNetwork = useEvmNetwork(tx.evmNetworkId)
  const hrefBlockExplorer = useMemo(
    () => (evmNetwork?.explorerUrl ? urlJoin(evmNetwork.explorerUrl, "tx", tx.hash) : null),
    [evmNetwork?.explorerUrl, tx.hash]
  )
  const handleBlockExplorerClick = useCallback(() => {
    if (!hrefBlockExplorer) return
    window.open(hrefBlockExplorer)
    window.close()
  }, [hrefBlockExplorer])

  return (
    <div
      className={classNames(
        " absolute top-0 right-0 z-10 flex h-[36px] items-center",
        isOpen ? "visible opacity-100" : "invisible opacity-0",
        enabled && "group-hover:visible group-hover:opacity-100"
      )}
    >
      <div className="relative">
        {isPending && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <ActionButton onClick={handleActionClick("speed-up")}>
                  <RocketIcon className="inline" />
                </ActionButton>
              </TooltipTrigger>
              <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
                Speed Up
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ActionButton onClick={handleActionClick("cancel")}>
                  <XOctagonIcon className="inline" />
                </ActionButton>
              </TooltipTrigger>
              <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
                Cancel
              </TooltipContent>
            </Tooltip>
          </>
        )}
        <Popover placement="bottom-end" open={isOpen} onOpenChange={handleOpenChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <ActionButton
                  className={classNames(isOpen && " !bg-grey-700 !text-body")}
                  onClick={() => handleOpenChange(true)}
                >
                  <MoreHorizontalIcon className="inline" />
                </ActionButton>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
              More options
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className={classNames(
              "border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left shadow-lg",
              isOpen ? "visible opacity-100" : "invisible opacity-0"
            )}
          >
            {isPending && (
              <>
                <button
                  onClick={handleActionClick("cancel")}
                  className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
                >
                  Cancel transaction
                </button>
                <button
                  onClick={handleActionClick("speed-up")}
                  className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
                >
                  Speed up transaction
                </button>
              </>
            )}
            {hrefBlockExplorer && (
              <button
                onClick={handleBlockExplorerClick}
                className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
              >
                View on block explorer
              </button>
            )}
            <button
              onClick={handleActionClick("dismiss")}
              className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
            >
              Dismiss
            </button>
          </PopoverContent>
        </Popover>
      </div>
      <TxSpeedUpDrawer tx={tx} isOpen={ocSpeedUp.isOpen} onClose={ocSpeedUp.close} />
      <TxCancelDrawer tx={tx} isOpen={ocCancelUp.isOpen} onClose={ocCancelUp.close} />
    </div>
  )
}

const TransactionStatusLabel: FC<{ status: TransactionStatus }> = ({ status }) => {
  switch (status) {
    case "error":
      return <span className="text-brand-orange">Failed</span>
    case "pending":
      return (
        <>
          <span>Sending </span>
          <LoaderIcon className="animate-spin-slow" />
        </>
      )
    case "success":
      return <span>Confirmed</span>
    case "replaced":
      return (
        <>
          <span>Cancelled</span>
          <XOctagonIcon className="text-brand-orange" />
        </>
      )
    case "unknown":
      return <span>Unknown</span>
  }
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

  const [isCtxMenuOpen, setIsCtxMenuOpen] = useState(false)

  const amount = useMemo(
    () =>
      token && value
        ? new BalanceFormatter(BigNumber.from(value).toBigInt(), token.decimals, tokenRates)
        : null,
    [token, tokenRates, value]
  )

  const handleOpenCtxMenu = useCallback(() => {
    if (!enabled) return
    onContextMenuOpen?.()
    setIsCtxMenuOpen(true)
  }, [enabled, onContextMenuOpen])

  const handleCloseCtxMenu = useCallback(() => {
    setIsCtxMenuOpen(false)
    onContextMenuClose?.()
  }, [onContextMenuClose])

  // can't render context menu on first mount or it breaks the slide up animation
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  return (
    <div
      className={classNames(
        " group z-0 flex h-[45px] w-full grow items-center gap-4 rounded-sm px-4",
        isCtxMenuOpen && "bg-grey-750",
        enabled && "hover:bg-grey-750"
      )}
    >
      <Tooltip>
        <TooltipTrigger className="cursor-default">
          <ChainLogo id={tx.evmNetworkId} className="shrink-0 text-xl" />
        </TooltipTrigger>
        <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
          {evmNetwork?.name}
        </TooltipContent>
      </Tooltip>
      <div className="leading-paragraph relative flex w-full grow justify-between">
        <div className="text-left">
          <div className="flex h-10 items-center gap-2 text-sm font-bold">
            <TransactionStatusLabel status={tx.status} />
            {tx.isReplacement && (
              <span className="bg-alert-warn/25 text-alert-warn rounded px-3 py-1 text-[10px] font-light">
                Replacement
              </span>
            )}
          </div>
          <div className="text-body-secondary h-[17px] text-xs">
            To: {to ? shortenAddress(to) : "unknown"}
          </div>
        </div>
        <div className="relative grow text-right">
          {amount && token && (
            <div
              className={classNames(
                isCtxMenuOpen ? "opacity-0" : "opacity-100",
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
          {isMounted && (
            <EvmTxActions
              tx={tx}
              enabled={enabled}
              isOpen={isCtxMenuOpen}
              onContextMenuOpen={handleOpenCtxMenu}
              onContextMenuClose={handleCloseCtxMenu}
            />
          )}
        </div>
      </div>
    </div>
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
  transactions: WalletTransaction[]
}> = ({ transactions }) => {
  const sortedTxs: WalletTransaction[] = useMemo(
    () =>
      sortBy(transactions, ["timestamp"])
        .reverse()
        .map((tx, i, arr) => ({
          ...tx,
          isReplacement: arr.findIndex((t) => t.hash !== tx.hash && t.nonce === tx.nonce) > i,
        })),
    [transactions]
  )

  // if context menu is open on a row, we need to disable others
  // because of this we need to control at list level which row shows buttons
  const [activeTxHash, setActiveTxHash] = useState<string>()

  const handleContextMenuOpen = useCallback(
    (hash: string) => () => {
      if (activeTxHash) return
      setActiveTxHash(hash)
    },
    [activeTxHash]
  )

  const handleContextMenuClose = useCallback(
    (hash: string) => () => {
      if (hash !== activeTxHash) return
      setActiveTxHash(undefined)
    },
    [activeTxHash]
  )

  return (
    <div className="scrollable scrollable-700 space-y-8 overflow-y-auto px-12">
      {sortedTxs?.map((tx) => (
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

type TransactionAction = "cancel" | "speed-up" | "dismiss"

export const PendingTransactionsDrawer: FC<{
  isOpen?: boolean
  onClose?: () => void
  transactions?: WalletTransaction[]
}> = ({ isOpen, onClose, transactions }) => {
  return (
    <Drawer
      anchor="bottom"
      isOpen={isOpen}
      onDismiss={onClose}
      containerId="main"
      className="bg-grey-800 flex w-full flex-col rounded-t-xl"
    >
      <div className="text-md text-body flex items-center gap-4 p-12 font-bold">
        <span>Pending transactions </span>
        <span className="bg-grey-700 text-body-secondary inline-flex h-12 w-12 flex-col items-center justify-center rounded-full text-xs">
          <span>{transactions?.length ?? 0}</span>
        </span>
      </div>
      {transactions && <TransactionsList transactions={transactions} />}
      <div className="p-12">
        <Button className="w-full shrink-0" onClick={onClose}>
          Close
        </Button>
      </div>
    </Drawer>
  )
}
