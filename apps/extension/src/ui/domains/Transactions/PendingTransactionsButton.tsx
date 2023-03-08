import { db } from "@core/db"
import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
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
import { CSSProperties, FC, forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import { useLayer } from "react-laag"
import { useMountedState } from "react-use"
import { Button, Drawer } from "talisman-ui"
import urlJoin from "url-join"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"
import { Popover, PopoverContent, PopoverTrigger } from "./Popover"
import { SpeedUpDrawer } from "./SpeedUpDrawer"

type TransactionRowProps = {
  tx: WalletTransaction
  enabled: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
  onActionClick?: (action: TransactionAction) => void
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
  enabled: boolean
  isOpen: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
  onActionClick?: (action: TransactionAction) => void
  onBlockExplorerClick?: () => void
}> = ({
  enabled,
  isOpen,
  onContextMenuOpen,
  onContextMenuClose,
  onActionClick,
  onBlockExplorerClick,
}) => {
  const handleActionClick = useCallback(
    (action: TransactionAction) => () => {
      onActionClick?.(action)
    },
    [onActionClick]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onContextMenuOpen?.()
      else onContextMenuClose?.()
    },
    [onContextMenuClose, onContextMenuOpen]
  )

  // const { renderLayer, triggerProps, layerProps } = useLayer({
  //   isOpen,
  //   onOutsideClick: onContextMenuClose, // close the menu when the user clicks outside
  //   onDisappear: onContextMenuClose, // close the menu when the menu gets scrolled out of sight
  //   auto: true, // automatically find the best placement
  //   possiblePlacements: ["bottom-end", "top-end"], // but we also accept "bottom-end"
  //   placement: "bottom-end", // we prefer to place the menu "top-end"
  //   triggerOffset: 8, // keep some distance to the trigger
  // })

  return (
    <div
      className={classNames(
        " absolute top-0 right-0 z-10 flex h-[36px] items-center",
        isOpen ? "visible opacity-100" : "invisible opacity-0",
        enabled && "group-hover:visible group-hover:opacity-100"
      )}
    >
      <div className="relative">
        <ActionButton onClick={handleActionClick("speed-up")}>
          <RocketIcon className="inline" />
        </ActionButton>
        <ActionButton onClick={handleActionClick("cancel")}>
          <XOctagonIcon className="inline" />
        </ActionButton>
        {/* <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            //{...triggerProps}
            className={classNames(
              "hover:bg-grey-700 text-body-secondary hover:text-body inline-block h-[36px] w-[36px] shrink-0 rounded-sm text-center",
              isOpen && " !bg-grey-700"
            )}
            onClick={() => handleOpenChange(true)}
          >
            <MoreHorizontalIcon className="inline" />
          </PopoverTrigger>
          <PopoverContent
            className={classNames(
              "border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left shadow-lg",
              isOpen ? "visible opacity-100" : "invisible opacity-0"
            )}
          >
            <button
              onClick={handleActionClick("cancel")}
              className="hover:bg-grey-800 rounded-xs h-20 p-6"
            >
              Cancel transaction
            </button>
            <button
              onClick={handleActionClick("speed-up")}
              className="hover:bg-grey-800 rounded-xs h-20 p-6"
            >
              Speed up transaction
            </button>
            <button
              onClick={onBlockExplorerClick}
              className="hover:bg-grey-800 rounded-xs h-20 p-6"
            >
              View on block explorer
            </button>
            <button
              onClick={handleActionClick("dismiss")}
              className="hover:bg-grey-800 rounded-xs h-20 p-6"
            >
              Dismiss
            </button>
          </PopoverContent>
        </Popover> */}
      </div>
    </div>
  )
}

const TransactionRowEvm: FC<TransactionRowPropsEvm> = ({
  tx,
  enabled,
  onContextMenuOpen,
  onContextMenuClose,
  onActionClick,
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

  const hrefBlockExplorer = useMemo(
    () => (evmNetwork?.explorerUrl ? urlJoin(evmNetwork.explorerUrl, "tx", tx.hash) : null),
    [evmNetwork?.explorerUrl, tx.hash]
  )
  const handleBlockExplorerClick = useCallback(() => {
    if (!hrefBlockExplorer) return
    window.open(hrefBlockExplorer)
    setIsCtxMenuOpen(false)
    window.close()
  }, [hrefBlockExplorer])

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
              enabled={enabled}
              isOpen={isCtxMenuOpen}
              onContextMenuOpen={handleOpenCtxMenu}
              onContextMenuClose={handleCloseCtxMenu}
              onActionClick={onActionClick}
              onBlockExplorerClick={handleBlockExplorerClick}
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
  transactions?: WalletTransaction[]
  onTxAction?: (hash: string, action: TransactionAction) => void
}> = ({ transactions, onTxAction }) => {
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

  const handleActionClick = useCallback(
    (hash: string) => (action: TransactionAction) => {
      onTxAction?.(hash, action)
      setActiveTxHash(undefined)
    },
    [onTxAction]
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
          onActionClick={handleActionClick(tx.hash)}
        />
      ))}
    </div>
  )
}

type TransactionAction = "cancel" | "speed-up" | "dismiss"

export const PendingTransactionsButton = () => {
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const { isOpen, open, close } = useOpenClose()

  const [currentAction, setCurrentAction] = useState<{
    tx?: WalletTransaction
    action?: TransactionAction
  }>({})

  const handleTxAction = useCallback(
    (hash: string, action: TransactionAction) => {
      setCurrentAction({
        tx: transactions?.find((tx) => tx.hash === hash),
        action,
      })
    },
    [transactions]
  )

  const handleCloseAction = useCallback(() => {
    setCurrentAction({})
  }, [])

  return (
    <>
      <IconButton onClick={open} className={transactions?.length ? "visible" : "invisible"}>
        <PendingTransactionsIcon />
      </IconButton>
      <Drawer
        anchor="bottom"
        isOpen={!!isOpen}
        onDismiss={close}
        containerId="main"
        className="bg-grey-800 flex w-full flex-col gap-12 rounded-t-xl p-12"
      >
        <div className="text-md text-body flex items-center gap-4 font-bold">
          <span>Pending transactions </span>
          <span className="bg-grey-700 text-body-secondary inline-flex h-12 w-12 flex-col items-center justify-center rounded-full text-xs">
            <span>{transactions?.length ?? 0}</span>
          </span>
        </div>
        <TransactionsList transactions={transactions} onTxAction={handleTxAction} />
        <Button className="w-full" onClick={close}>
          Close
        </Button>
      </Drawer>
      <SpeedUpDrawer
        tx={currentAction?.tx}
        isOpen={currentAction?.action === "speed-up"}
        onClose={handleCloseAction}
      />
    </>
  )
}
