import i18next from "@common/i18nConfig"
import {
  EvmWalletTransaction,
  SubWalletTransaction,
  TransactionStatus,
  WalletTransaction,
} from "@extension/core"
import { isAcalaEvmPlus } from "@extension/core"
import { db } from "@extension/core"
import { IS_FIREFOX } from "@extension/shared"
import { convertAddress } from "@talisman/util/convertAddress"
import { BalanceFormatter } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { LoaderIcon, MoreHorizontalIcon, RocketIcon, XOctagonIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AnalyticsPage } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import formatDistanceToNowStrict from "date-fns/formatDistanceToNowStrict"
import { useLiveQuery } from "dexie-react-hooks"
import sortBy from "lodash/sortBy"
import { FC, PropsWithChildren, forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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
import { Fiat } from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { NetworkLogo } from "../Ethereum/NetworkLogo"
import { useSelectedAccount } from "../Portfolio/useSelectedAccount"
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

  return (
    <img
      loading="lazy"
      src={iconUrl}
      crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
      className={className}
      alt=""
      onError={handleError}
    />
  )
}

const TxIconContainer: FC<
  PropsWithChildren & { tooltip?: string | null; networkId?: EvmNetworkId | ChainId }
> = ({ children, tooltip, networkId }) => (
  <Tooltip>
    <TooltipTrigger className="relative h-16 w-16 shrink-0 cursor-default">
      {children}
      {!!networkId && (
        <ChainLogo
          id={networkId}
          className="border-grey-800 !absolute right-[-4px] top-[-4px] h-8 w-8 rounded-full border"
        />
      )}
    </TooltipTrigger>
    <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
      {tooltip}
    </TooltipContent>
  </Tooltip>
)

const displayDistanceToNow = (timestamp: number) =>
  Date.now() - timestamp > 60_000
    ? formatDistanceToNowStrict(timestamp, { addSuffix: true })
    : i18next.t("Just now")

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
      type={type}
      ref={ref}
      className={classNames(
        "hover:bg-grey-700 text-body-secondary hover:text-body inline-block h-[36px] w-[36px] shrink-0 rounded-sm text-center",
        className
      )}
      {...props}
    />
  )
})
ActionButton.displayName = "ActionButton"

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

  const { t } = useTranslation("request")

  return (
    <div
      className={classNames(
        " absolute right-0 top-0 z-10 flex h-[36px] items-center",
        isOpen ? "visible opacity-100" : "invisible opacity-0",
        enabled && "group-hover:visible group-hover:opacity-100"
      )}
    >
      <div className="relative">
        {isPending && !isAcalaEvmPlus(tx.evmNetworkId) && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <ActionButton onClick={handleActionClick("speed-up")}>
                  <RocketIcon className="inline" />
                </ActionButton>
              </TooltipTrigger>
              <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
                {t("Speed Up")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ActionButton onClick={handleActionClick("cancel")}>
                  <XOctagonIcon className="inline" />
                </ActionButton>
              </TooltipTrigger>
              <TooltipContent className="bg-grey-700 rounded-xs z-20 p-3 text-xs shadow">
                {t("Cancel")}
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
              {t("More options")}
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
                  type="button"
                  onClick={handleActionClick("cancel")}
                  className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
                >
                  {t("Cancel transaction")}
                </button>
                <button
                  type="button"
                  onClick={handleActionClick("speed-up")}
                  className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
                >
                  {t("Speed up transaction")}
                </button>
              </>
            )}
            {hrefBlockExplorer && (
              <button
                type="button"
                onClick={handleBlockExplorerClick}
                className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
              >
                {t("View on block explorer")}
              </button>
            )}
            <button
              type="button"
              onClick={handleActionClick("dismiss")}
              className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
            >
              {t("Dismiss")}
            </button>
          </PopoverContent>
        </Popover>
      </div>
      <TxReplaceDrawer tx={tx} type={replaceType} onClose={() => setReplaceType(undefined)} />
    </div>
  )
}

const TransactionStatusLabel: FC<{ status: TransactionStatus }> = ({ status }) => {
  const { t } = useTranslation("request")

  switch (status) {
    case "error":
      return <span className="text-brand-orange">{t("Failed")}</span>
    case "pending":
      return (
        <>
          <span>{t("Sending")} </span>
          <LoaderIcon className="animate-spin-slow" />
        </>
      )
    case "success":
      return <span>{t("Confirmed")}</span>
    case "replaced":
      return (
        <>
          <span>{t("Cancelled")}</span>
          <XOctagonIcon className="text-brand-orange" />
        </>
      )
    case "unknown":
      return <span>{t("Unknown")}</span>
  }
}

const TransactionRowEvm: FC<TransactionRowEvmProps> = ({
  tx,
  enabled,
  onContextMenuOpen,
  onContextMenuClose,
}) => {
  const evmNetwork = useEvmNetwork(tx.evmNetworkId)

  const { isTransfer, value, tokenId } = useMemo(() => {
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
  const currency = useSelectedCurrency()

  const [isCtxMenuOpen, setIsCtxMenuOpen] = useState(false)

  const amount = useMemo(
    () => (token && value ? new BalanceFormatter(value, token.decimals, tokenRates) : null),
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

  const { t } = useTranslation("request")

  return (
    <div
      className={classNames(
        " group z-0 flex h-[45px] w-full grow items-center gap-4 rounded-sm px-4",
        isCtxMenuOpen && "bg-grey-750",
        enabled && "hover:bg-grey-750"
      )}
    >
      {tx.siteUrl ? (
        <TxIconContainer tooltip={tx.siteUrl} networkId={evmNetwork?.id}>
          <Favicon siteUrl={tx.siteUrl} className="!h-16 !w-16" />
        </TxIconContainer>
      ) : isTransfer && token ? (
        <TxIconContainer
          tooltip={`${token?.symbol} on ${evmNetwork?.name}`}
          networkId={evmNetwork?.id}
        >
          <TokenLogo tokenId={token.id} className="!h-16 !w-16" />
        </TxIconContainer>
      ) : (
        <TxIconContainer tooltip={evmNetwork?.name}>
          <ChainLogo id={evmNetwork?.id} className="!h-16 !w-16" />
        </TxIconContainer>
      )}

      <div className="leading-paragraph relative flex w-full grow justify-between">
        <div className="text-left">
          <div className="flex h-10 items-center gap-2 text-sm font-bold">
            <TransactionStatusLabel status={tx.status} />
            {tx.isReplacement && (
              <span className="bg-alert-warn/25 text-alert-warn rounded px-3 py-1 text-[10px] font-light">
                {t("Replacement")}
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
                {amount.fiat(currency) && <Fiat amount={amount} noCountUp />}
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

  const { t } = useTranslation("request")

  return (
    <div
      className={classNames(
        "absolute right-0 top-0 z-10 flex h-[36px] items-center",
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
              {t("More options")}
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
                type="button"
                onClick={handleBlockExplorerClick}
                className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
              >
                {t("View on block explorer")}
              </button>
            )}
            <button
              type="button"
              onClick={handleActionClick("dismiss")}
              className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
            >
              {t("Dismiss")}
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
  const currency = useSelectedCurrency()

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

  const { t } = useTranslation("request")

  return (
    <div
      className={classNames(
        " group z-0 flex h-[45px] w-full grow items-center gap-4 rounded-sm px-4",
        isCtxMenuOpen && "bg-grey-750",
        enabled && "hover:bg-grey-750"
      )}
    >
      {tx.siteUrl ? (
        <TxIconContainer tooltip={tx.siteUrl} networkId={chain?.id}>
          <Favicon siteUrl={tx.siteUrl} className="!h-16 !w-16" />
        </TxIconContainer>
      ) : isTransfer && token ? (
        <TxIconContainer tooltip={`${token?.symbol} on ${chain?.name}`} networkId={chain?.id}>
          <TokenLogo tokenId={token.id} className="!h-16 !w-16" />
        </TxIconContainer>
      ) : (
        <TxIconContainer tooltip={chain?.name}>
          <ChainLogo id={chain?.id} className="!h-16 !w-16" />
        </TxIconContainer>
      )}
      <div className="leading-paragraph relative flex w-full grow justify-between">
        <div className="text-left">
          <div className="flex h-10 items-center gap-2 text-sm font-bold">
            <TransactionStatusLabel status={tx.status} />
            {tx.isReplacement && (
              <span className="bg-alert-warn/25 text-alert-warn rounded px-3 py-1 text-[10px] font-light">
                {t("Replacement")}
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
                {amount.fiat(currency) && <Fiat amount={amount} noCountUp />}
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
  const { t } = useTranslation("request")
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
      {!sortedTxs.length && (
        <div className="text-body-secondary text-center text-sm">
          {t("No transactions available")}
        </div>
      )}
    </div>
  )
}

const DrawerContent: FC<{ transactions: WalletTransaction[]; onClose?: () => void }> = ({
  transactions,
  onClose,
}) => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const { t } = useTranslation("request")

  return (
    <>
      <h3 className="text-md mt-12 text-center font-bold">{t("Recent Activity")}</h3>
      <p className="text-body-secondary leading-paragraph my-8 w-full px-24 text-center text-sm">
        {t("View recent and pending transactions for the past week.")}
      </p>
      <TransactionsList transactions={transactions} />
      <div className="p-12">
        <Button className="w-full shrink-0" onClick={onClose}>
          {t("Close")}
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
