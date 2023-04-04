import { db } from "@core/db"
import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/transactions/types"
import { TransactionStatus } from "@core/domains/transactions/types"
import { LoaderIcon, MoreHorizontalIcon, RocketIcon, XOctagonIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import formatDistanceToNowStrict from "date-fns/formatDistanceToNowStrict"
import { useLiveQuery } from "dexie-react-hooks"
import { BigNumber } from "ethers"
import sortBy from "lodash/sortBy"
import { FC, forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import {
  Button,
  Drawer,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenCloseWithData,
} from "talisman-ui"
import urlJoin from "url-join"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { NetworkLogo } from "../Ethereum/NetworkLogo"
import { useSelectedAccount } from "../Portfolio/SelectedAccountContext"
import { TxReplaceDrawer } from "./TxReplaceDrawer"
import { TxReplaceType } from "./types"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Transactions",
  featureVersion: 1,
  page: "Recent history drawer",
}

type TransactionRowProps = {
  tx: WalletTransaction
  enabled: boolean
  onContextMenuOpen?: () => void
  onContextMenuClose?: () => void
}

type TransactionRowEvmProps = TransactionRowProps & { tx: EvmWalletTransaction }
type TransactionRowSubProps = TransactionRowProps & { tx: SubWalletTransaction }

type TransactionAction = "cancel" | "speed-up" | "dismiss"

const Favicon: FC<{ siteUrl: string; className?: string }> = ({ siteUrl, className }) => {
  const iconUrl = useFaviconUrl(siteUrl)
  const [isError, setError] = useState(false)

  const handleError = useCallback(() => {
    setError(true)
  }, [])

  if (!iconUrl) return null
  if (isError) return <NetworkLogo className={className} />

  return <img loading="lazy" src={iconUrl} className={className} onError={handleError} />
}

const displayDistanceToNow = (timestamp: number) =>
  Date.now() - timestamp > 60_000
    ? formatDistanceToNowStrict(timestamp, { addSuffix: true })
    : "Just now"

const DistanceToNow: FC<{ timestamp: number }> = ({ timestamp }) => {
  const [text, setText] = useState(() => displayDistanceToNow(timestamp))

  useEffect(() => {
    const interval = setInterval(() => {
      setText(displayDistanceToNow(timestamp))
    }, 10_000)

    return () => clearInterval(interval)
  }, [text, timestamp])

  return <>{text}</>
}

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

  const [replaceType, setReplaceType] = useState<TxReplaceType>()

  const handleActionClick = useCallback(
    (action: TransactionAction) => () => {
      onContextMenuClose?.()
      if (action === "speed-up") setReplaceType("speed-up")
      if (action === "cancel") setReplaceType("cancel")
      if (action === "dismiss") db.transactions.delete(tx.hash)
    },
    [onContextMenuClose, tx.hash]
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
      <TxReplaceDrawer tx={tx} type={replaceType} onClose={() => setReplaceType(undefined)} />
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

const TransactionRowEvm: FC<TransactionRowEvmProps> = ({
  tx,
  enabled,
  onContextMenuOpen,
  onContextMenuClose,
}) => {
  const evmNetwork = useEvmNetwork(tx.evmNetworkId)

  const { isTransfer, value, tokenId, to } = useMemo(() => {
    const isTransfer = !!tx.tokenId && !!tx.value && tx.to
    return isTransfer
      ? { isTransfer, value: tx.value, tokenId: tx.tokenId, to: tx.to }
      : {
          isTransfer,
          value: tx.unsigned.value,
          tokenId: evmNetwork?.nativeToken?.id,
          to: tx.unsigned.to,
        }
  }, [evmNetwork?.nativeToken?.id, tx.to, tx.tokenId, tx.unsigned.to, tx.unsigned.value, tx.value])

  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

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
      {tx.siteUrl ? (
        <>
          <Tooltip>
            <TooltipTrigger className="shrink-0 cursor-default">
              <Favicon siteUrl={tx.siteUrl} className="h-16 w-16" />
            </TooltipTrigger>
            <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
              {tx.siteUrl}
            </TooltipContent>
          </Tooltip>
        </>
      ) : isTransfer && token ? (
        <Tooltip>
          <TooltipTrigger className="shrink-0 cursor-default">
            <TokenLogo tokenId={token.id} className="text-xl" />
          </TooltipTrigger>
          <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
            {token?.symbol} on {evmNetwork?.name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger className="shrink-0 cursor-default">
            <ChainLogo id={tx.evmNetworkId} className="text-xl" />
          </TooltipTrigger>
          <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
            {evmNetwork?.name}
          </TooltipContent>
        </Tooltip>
      )}

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
            <DistanceToNow timestamp={tx.timestamp} />
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

// this context menu prevents drawer animation to slide up correctly, render when it's finished
const SubTxActions: FC<{
  tx: SubWalletTransaction
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
  const handleActionClick = useCallback(
    (action: TransactionAction) => () => {
      onContextMenuClose?.()
      if (action === "dismiss") db.transactions.delete(tx.hash)
    },
    [onContextMenuClose, tx.hash]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onContextMenuOpen?.()
      else onContextMenuClose?.()
    },
    [onContextMenuClose, onContextMenuOpen]
  )

  const chain = useChainByGenesisHash(tx.genesisHash)
  const hrefBlockExplorer = useMemo(
    () => (chain?.subscanUrl ? urlJoin(chain.subscanUrl, "tx", tx.hash) : null),
    [chain?.subscanUrl, tx.hash]
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
    </div>
  )
}

const TransactionRowSubstrate: FC<TransactionRowSubProps> = ({
  tx,
  enabled,
  onContextMenuOpen,
  onContextMenuClose,
}) => {
  const { genesisHash } = tx.unsigned
  const chain = useChainByGenesisHash(genesisHash)
  const token = useToken(tx.tokenId)
  const tokenRates = useTokenRates(tx.tokenId)

  const { isTransfer, amount } = useMemo(() => {
    const isTransfer = tx.value && tx.tokenId && tx.to && token
    return {
      isTransfer,
      amount: isTransfer ? new BalanceFormatter(tx.value, token.decimals, tokenRates) : null,
    }
  }, [token, tokenRates, tx.to, tx.tokenId, tx.value])

  const [isCtxMenuOpen, setIsCtxMenuOpen] = useState(false)

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
      {tx.siteUrl ? (
        <>
          <Tooltip>
            <TooltipTrigger className="shrink-0 cursor-default">
              <Favicon siteUrl={tx.siteUrl} className="h-16 w-16" />
            </TooltipTrigger>
            <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
              {tx.siteUrl}
            </TooltipContent>
          </Tooltip>
        </>
      ) : isTransfer && token ? (
        <Tooltip>
          <TooltipTrigger className="shrink-0 cursor-default">
            <TokenLogo tokenId={token.id} className="text-xl" />
          </TooltipTrigger>
          <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
            {token?.symbol} on {chain?.name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger className="shrink-0 cursor-default">
            <ChainLogo id={chain?.id} className="text-xl" />
          </TooltipTrigger>
          <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
            {chain?.name}
          </TooltipContent>
        </Tooltip>
      )}
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
            <DistanceToNow timestamp={tx.timestamp} />
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
            <SubTxActions
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
    case "substrate":
      return <TransactionRowSubstrate tx={tx} {...props} />
    default:
      return null
  }
}

const TransactionsList: FC<{
  transactions: WalletTransaction[]
}> = ({ transactions }) => {
  const sortedTxs: WalletTransaction[] = useMemo(
    // results should already be sorted by the caller, this is just in case
    () => sortBy(transactions, ["timestamp"]).reverse(),
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

const DrawerContent: FC<{ transactions: WalletTransaction[]; onClose?: () => void }> = ({
  transactions,
  onClose,
}) => {
  const { account } = useSelectedAccount()
  useAnalyticsPageView(ANALYTICS_PAGE)
  const showTxHistory = useIsFeatureEnabled("LINK_TX_HISTORY")

  const handleTxHistoryClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Tx History button",
    })
    window.open(getTransactionHistoryUrl(account?.address), "_blank")
    window.close()
  }, [account?.address])

  return (
    <>
      <h3 className="text-md mt-12 text-center font-bold">Recent Activity</h3>
      <p className="text-body-secondary leading-paragraph my-8 w-full px-24 text-center text-sm">
        View recent and pending transactions for the past week.
        {showTxHistory && (
          <>
            {" "}
            For a comprehesive history visit our{" "}
            <button type="button" onClick={handleTxHistoryClick} className="text-body inline">
              transaction history page
            </button>
          </>
        )}
      </p>
      <TransactionsList transactions={transactions} />
      <div className="p-12">
        <Button className="w-full shrink-0" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  )
}

export const PendingTransactionsDrawer: FC<{
  isOpen?: boolean
  onClose?: () => void
}> = ({ isOpen, onClose }) => {
  const { account } = useSelectedAccount()
  // load transactions only if we need to open the drawer
  const transactions = useLiveQuery<WalletTransaction[] | undefined>(
    () =>
      isOpen
        ? db.transactions
            .filter(
              (tx) =>
                !account ||
                convertAddress(account.address, null) === convertAddress(tx.account, null)
            )
            .reverse()
            .sortBy("timestamp")
        : undefined,
    [isOpen]
  )

  const { isOpenReady, data } = useOpenCloseWithData(isOpen, transactions)

  return (
    <Drawer
      anchor="bottom"
      isOpen={isOpenReady}
      onDismiss={onClose}
      containerId="main"
      className="bg-grey-800 flex w-full flex-col rounded-t-xl"
    >
      {data ? <DrawerContent transactions={data} onClose={onClose} /> : null}
    </Drawer>
  )
}
