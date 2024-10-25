import { LoaderIcon, MoreHorizontalIcon, RocketIcon, XOctagonIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { formatDistanceToNowStrict } from "date-fns"
import {
  BalanceFormatter,
  ChainId,
  db,
  EvmNetworkId,
  EvmWalletTransaction,
  isAcalaEvmPlus,
  SubWalletTransaction,
  TransactionStatus,
  WalletTransaction,
} from "extension-core"
import { IS_FIREFOX } from "extension-shared"
import i18next from "i18next"
import {
  FC,
  forwardRef,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"
import urlJoin from "url-join"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Ethereum/NetworkLogo"
import { useFaviconUrl } from "@ui/hooks/useFaviconUrl"
import {
  useChainByGenesisHash,
  useEvmNetwork,
  useSelectedCurrency,
  useToken,
  useTokenRates,
} from "@ui/state"
import { IS_EMBEDDED_POPUP, IS_POPUP } from "@ui/util/constants"

import { TxReplaceDrawer } from "../TxReplaceDrawer"
import { TxReplaceType } from "../types"
import { useTxHistory } from "./TxHistoryContext"
import { useCanReplaceTx } from "./useCanReplaceTx"

export const TxHistoryList = () => {
  const { isLoading, transactions } = useTxHistory()
  const { t } = useTranslation()

  // if context menu is open on a row, we need to disable others
  // because of this we need to control at list level which row shows buttons
  const [activeTxHash, setActiveTxHash] = useState<string>()

  const handleContextMenuOpen = useCallback(
    (hash: string) => () => {
      if (activeTxHash) return
      setActiveTxHash(hash)
    },
    [activeTxHash],
  )

  const handleContextMenuClose = useCallback(
    (hash: string) => () => {
      if (hash !== activeTxHash) return
      setActiveTxHash(undefined)
    },
    [activeTxHash],
  )

  return (
    <div className="flex w-full flex-col gap-4 pb-4">
      {transactions.map((tx) => (
        <TransactionRow
          key={tx.hash}
          tx={tx}
          enabled={!activeTxHash || activeTxHash === tx.hash}
          onContextMenuOpen={handleContextMenuOpen(tx.hash)}
          onContextMenuClose={handleContextMenuClose(tx.hash)}
        />
      ))}
      {!isLoading && !transactions.length && (
        <div className="text-body-disabled bg-grey-900 flex h-40 w-full flex-col items-center justify-center rounded-sm text-sm">
          {t("No transactions found")}
        </div>
      )}
      {isLoading && <TransactionRowShimmer />}
    </div>
  )
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
        className,
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
  const canReplace = useCanReplaceTx(tx)

  const [replaceType, setReplaceType] = useState<TxReplaceType>()

  const handleActionClick = useCallback(
    (action: TransactionAction) => () => {
      onContextMenuClose?.()
      if (action === "speed-up") setReplaceType("speed-up")
      if (action === "cancel") setReplaceType("cancel")
      if (action === "dismiss") db.transactions.delete(tx.hash) // TODO via backend
    },
    [onContextMenuClose, tx.hash],
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onContextMenuOpen?.()
      else onContextMenuClose?.()
    },
    [onContextMenuClose, onContextMenuOpen],
  )

  const evmNetwork = useEvmNetwork(tx.evmNetworkId)
  const hrefBlockExplorer = useMemo(
    () => (evmNetwork?.explorerUrl ? urlJoin(evmNetwork.explorerUrl, "tx", tx.hash) : null),
    [evmNetwork?.explorerUrl, tx.hash],
  )
  const handleBlockExplorerClick = useCallback(() => {
    if (!hrefBlockExplorer) return
    window.open(hrefBlockExplorer, "_blank")
    if (IS_EMBEDDED_POPUP) window.close()
  }, [hrefBlockExplorer])

  const { t } = useTranslation("request")

  return (
    <div
      className={classNames(
        "absolute right-0 top-0 z-10 flex items-center",
        IS_POPUP ? "h-[36px]" : "h-[42px]",
        isOpen ? "visible opacity-100" : "invisible opacity-0",
        enabled && "group-hover:visible group-hover:opacity-100",
      )}
    >
      <div className="relative">
        {canReplace && !isAcalaEvmPlus(tx.evmNetworkId) && (
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
                  className={classNames(isOpen && "!bg-grey-700 !text-body")}
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
              isOpen ? "visible opacity-100" : "invisible opacity-0",
            )}
          >
            {canReplace && (
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

const TransactionRowBase: FC<{
  isCtxMenuOpen: boolean
  enabled: boolean
  logo: ReactNode
  status: ReactNode
  wen: ReactNode
  tokens: ReactNode
  fiat: ReactNode
  actions: ReactNode
}> = ({ isCtxMenuOpen, enabled, logo, status, wen, tokens, fiat, actions }) => {
  return (
    <div
      className={classNames(
        "bg-grey-850 group z-0 flex w-full grow items-center rounded-sm",
        IS_POPUP ? "h-[5.2rem] gap-6 px-6" : "h-[5.8rem] gap-8 px-8",
        isCtxMenuOpen && "bg-grey-800",
        enabled && "hover:bg-grey-800",
      )}
    >
      {logo}
      <div className="leading-paragraph relative flex w-full grow justify-between">
        <div className="flex flex-col items-start justify-center">
          <div
            className={classNames(
              "text-body flex h-10 items-center gap-2 font-bold",
              IS_POPUP ? "text-sm" : "text-base",
            )}
          >
            {status}
          </div>
          <div className={classNames("text-body-disabled", IS_POPUP ? "text-xs" : "text-sm")}>
            {wen}
          </div>
        </div>
        <div className="relative flex grow flex-col items-end justify-center">
          <div
            className={classNames(
              "text-right",
              isCtxMenuOpen ? "opacity-0" : "opacity-100",
              enabled && "group-hover:opacity-0",
            )}
          >
            <div className={classNames("text-body", IS_POPUP ? "text-sm" : "text-base")}>
              {tokens}
            </div>
            <div className={classNames("text-body-disabled", IS_POPUP ? "text-xs" : "text-sm")}>
              {fiat}
            </div>
          </div>

          {actions}
        </div>
      </div>
    </div>
  )
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
    [token, tokenRates, value],
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

  const { t } = useTranslation("request")

  return (
    <TransactionRowBase
      isCtxMenuOpen={isCtxMenuOpen}
      enabled={enabled}
      logo={
        tx.siteUrl ? (
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
        )
      }
      status={
        <>
          <TransactionStatusLabel status={tx.status} />
          {tx.isReplacement && (
            <span className="bg-alert-warn/25 text-alert-warn rounded px-3 py-1 text-[10px] font-light">
              {t("Replacement")}
            </span>
          )}
        </>
      }
      wen={<DistanceToNow timestamp={tx.timestamp} />}
      tokens={
        !!amount &&
        !!token && (
          <Tokens
            amount={amount.tokens}
            decimals={token.decimals}
            noCountUp
            symbol={token.symbol}
          />
        )
      }
      fiat={!!amount && amount.fiat(currency) && <Fiat amount={amount} noCountUp />}
      actions={
        <EvmTxActions
          tx={tx}
          enabled={enabled}
          isOpen={isCtxMenuOpen}
          onContextMenuOpen={handleOpenCtxMenu}
          onContextMenuClose={handleCloseCtxMenu}
        />
      }
    />
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
      if (action === "dismiss") db.transactions.delete(tx.hash) // TODO via backend
    },
    [onContextMenuClose, tx.hash],
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) onContextMenuOpen?.()
      else onContextMenuClose?.()
    },
    [onContextMenuClose, onContextMenuOpen],
  )

  const chain = useChainByGenesisHash(tx.genesisHash)
  const hrefBlockExplorer = useMemo(
    () => (chain?.subscanUrl ? urlJoin(chain.subscanUrl, "tx", tx.hash) : null),
    [chain?.subscanUrl, tx.hash],
  )
  const handleBlockExplorerClick = useCallback(() => {
    if (!hrefBlockExplorer) return
    window.open(hrefBlockExplorer, "_blank")
    if (IS_EMBEDDED_POPUP) window.close()
  }, [hrefBlockExplorer])

  const { t } = useTranslation("request")

  return (
    <div
      className={classNames(
        "absolute right-0 top-0 z-10 flex h-[36px] items-center",
        isOpen ? "visible opacity-100" : "invisible opacity-0",
        enabled && "group-hover:visible group-hover:opacity-100",
      )}
    >
      <div className="relative">
        <Popover placement="bottom-end" open={isOpen} onOpenChange={handleOpenChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <ActionButton
                  className={classNames(isOpen && "!bg-grey-700 !text-body")}
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
              isOpen ? "visible opacity-100" : "invisible opacity-0",
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

  const { t } = useTranslation("request")

  return (
    <TransactionRowBase
      isCtxMenuOpen={isCtxMenuOpen}
      enabled={enabled}
      logo={
        tx.siteUrl ? (
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
        )
      }
      status={
        <>
          <TransactionStatusLabel status={tx.status} />
          {tx.isReplacement && (
            <span className="bg-alert-warn/25 text-alert-warn rounded px-3 py-1 text-[10px] font-light">
              {t("Replacement")}
            </span>
          )}
        </>
      }
      wen={<DistanceToNow timestamp={tx.timestamp} />}
      tokens={
        !!amount &&
        !!token && (
          <Tokens
            amount={amount.tokens}
            decimals={token.decimals}
            noCountUp
            symbol={token.symbol}
          />
        )
      }
      fiat={!!amount && amount.fiat(currency) && <Fiat amount={amount} noCountUp />}
      actions={
        <SubTxActions
          tx={tx}
          enabled={enabled}
          isOpen={isCtxMenuOpen}
          onContextMenuOpen={handleOpenCtxMenu}
          onContextMenuClose={handleCloseCtxMenu}
        />
      }
    />
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

const TransactionRowShimmer = () => {
  return (
    <TransactionRowBase
      isCtxMenuOpen={false}
      enabled={false}
      logo={<div className="bg-grey-800 h-16 w-16 shrink-0 animate-pulse rounded-full" />}
      status={
        <div className="bg-grey-800 text-grey-800 rounded-xs mb-1 animate-pulse text-sm">
          Dunno yet
        </div>
      }
      wen={
        <div className="bg-grey-800 text-grey-800 rounded-xs mt-1 animate-pulse text-xs">
          Very long time ago
        </div>
      }
      actions={null}
      tokens={null}
      fiat={null}
    />
  )
}
