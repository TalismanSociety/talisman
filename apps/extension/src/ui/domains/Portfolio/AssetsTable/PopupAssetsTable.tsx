import { TALISMAN_WEB_APP_STAKING_URL } from "@core/constants"
import { Balances } from "@core/domains/balances/types"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { FadeIn } from "@talisman/components/FadeIn"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ExternalLinkIcon, LockIcon, XIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { MouseEventHandler, ReactNode, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { TokenLogo } from "../../Asset/TokenLogo"
import { useNomPoolStakingBanner } from "../NomPoolStakingContext"
import { useSelectedAccount } from "../SelectedAccountContext"
import { StaleBalancesIcon } from "../StaleBalancesIcon"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

type AssetRowProps = {
  balances: Balances
  locked?: boolean
}

const AssetRow = ({ balances, locked }: AssetRowProps) => {
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const { account } = useSelectedAccount()
  const status = useBalancesStatus(balances)

  const { token, summary, rate } = useTokenBalancesSummary(balances)
  const { showNomPoolBanner, dismissNomPoolBanner } = useNomPoolStakingBanner()
  const showBanner = showNomPoolBanner({
    chainId: token?.chain?.id,
    addresses: Array.from(new Set(locked ? [] : balances.each.map((b) => b.address))),
  })
  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (!token) return

    const params = new URLSearchParams()
    token.isTestnet && params.set("testnet", "true")
    account && params.set("account", account?.address)

    navigate(`/portfolio/${encodeURIComponent(token.symbol)}?${params.toString()}`)
    genericEvent("goto portfolio asset", { from: "popup", symbol: token.symbol })
  }, [account, genericEvent, navigate, token])

  const handleClickStakingBanner = useCallback(() => {
    window.open(TALISMAN_WEB_APP_STAKING_URL)
    genericEvent("open web app staking from banner", { from: "popup", symbol: token?.symbol })
  }, [genericEvent, token?.symbol])

  const handleDismissStakingBanner: MouseEventHandler<SVGSVGElement> = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      dismissNomPoolBanner()
      genericEvent("dismiss staking banner", { from: "popup", symbol: token?.symbol })
    },
    [genericEvent, dismissNomPoolBanner, token?.symbol]
  )

  const { tokens, fiat } = useMemo(() => {
    return {
      tokens: locked ? summary.lockedTokens : summary.availableTokens,
      fiat: locked ? summary.lockedFiat : summary.availableFiat,
    }
  }, [
    locked,
    summary.availableFiat,
    summary.availableTokens,
    summary.lockedFiat,
    summary.lockedTokens,
  ])

  const { t } = useTranslation()

  if (!token || !summary) return null

  return (
    <>
      <button
        type="button"
        className="bg-grey-850 hover:bg-grey-800 flex h-28 w-full items-center rounded-sm"
        onClick={handleClick}
      >
        <div className="p-6 text-xl">
          <TokenLogo tokenId={token.id} />
        </div>
        <div className="relative flex grow gap-4 pr-6">
          <div className="relative grow">
            {/* we want content from this cell to be hidden if there are too many tokens to display on right cell */}
            <div className="absolute left-0 top-0 flex w-full flex-col gap-2 overflow-hidden text-left">
              <div className="flex items-center gap-3">
                <div className="text-body flex items-center gap-3 whitespace-nowrap text-sm font-bold">
                  {token.symbol}
                  {!!token.isTestnet && (
                    <span className="text-tiny bg-alert-warn/10 text-alert-warn rounded px-3 py-1 font-light">
                      {t("Testnet")}
                    </span>
                  )}
                </div>
                {!!networkIds.length && (
                  <div className="text-base">
                    <NetworksLogoStack networkIds={networkIds} max={3} />
                  </div>
                )}
              </div>
              {rate !== undefined && <Fiat amount={rate} className="text-body-secondary text-xs" />}
            </div>
          </div>
          <div
            className={classNames(
              "flex flex-col items-end gap-2 text-right",
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          >
            {status.status === "initializing" ? (
              <>
                <div className="bg-grey-700 rounded-xs h-7 w-[10rem] animate-pulse"></div>
                <div className="bg-grey-700 rounded-xs h-7 w-[6rem] animate-pulse"></div>
              </>
            ) : (
              <>
                <div
                  className={classNames(
                    "whitespace-nowrap text-sm font-bold",
                    locked ? "text-body-secondary" : "text-white"
                  )}
                >
                  <Tokens amount={tokens} symbol={token?.symbol} isBalance />
                  {locked ? <LockIcon className="lock ml-2 inline align-baseline text-xs" /> : null}
                  <StaleBalancesIcon
                    className="alert ml-2 inline align-baseline text-sm"
                    staleChains={status.status === "stale" ? status.staleChains : []}
                  />
                </div>
                <div className="text-body-secondary leading-base text-xs">
                  {fiat === null ? "-" : <Fiat amount={fiat} isBalance />}
                </div>
              </>
            )}
          </div>
        </div>
      </button>
      {showBanner && (
        <button
          type="button"
          onClick={handleClickStakingBanner}
          className="staking-banner bg-primary-500 text-primary-500 flex h-28 w-full items-center justify-between rounded-sm bg-opacity-10 p-[1rem]"
        >
          <div className="flex gap-2">
            <div className="self-center">
              <ZapIcon className="h-[2.6rem] w-[2.6rem]" />
            </div>
            <div className="flex flex-col justify-start gap-[0.2rem] text-start text-sm text-white">
              <span className="font-bold">
                {t("You're eligible for {{symbol}} staking!", { symbol: token?.symbol })}
              </span>
              <div className="inline-flex gap-1 text-xs">
                <Trans
                  t={t}
                  defaults={`Earn ~15% yield on your {{symbol}} on the <Highlight>Portal <ExternalLinkIcon /></Highlight>`}
                  values={{ symbol: token?.symbol }}
                  components={{
                    Highlight: <span className="text-primary-500 flex gap-1" />,
                    ExternalLinkIcon: <ExternalLinkIcon />,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="self-start">
            <XIcon role="button" onClick={handleDismissStakingBanner} className="h-6" />
          </div>
        </button>
      )}
    </>
  )
}

type GroupedAssetsTableProps = {
  balances: Balances
}

type GroupProps = {
  label: ReactNode
  fiatAmount: number
  className?: string
  children?: ReactNode
}

const BalancesGroup = ({ label, fiatAmount, className, children }: GroupProps) => {
  const { isOpen, toggle } = useOpenClose(true)

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className={classNames("flex cursor-pointer items-center gap-2 text-sm", className)}
        onClick={toggle}
      >
        <div className="text-body-secondary grow text-left">{label}</div>
        <div className="text-body-secondary truncate">
          <Fiat amount={fiatAmount} isBalance />
        </div>
        <div className="text-body-secondary text-md flex flex-col justify-center">
          <AccordionIcon isOpen={isOpen} />
        </div>
      </button>
      <Accordion alwaysRender isOpen={isOpen}>
        <div className="flex flex-col gap-4">{children}</div>
      </Accordion>
    </div>
  )
}

export const PopupAssetsTable = ({ balances }: GroupedAssetsTableProps) => {
  const { t } = useTranslation()
  const { account } = useSelectedAccount()
  const currency = useSelectedCurrency()

  // group by status by token (symbol)
  const { availableSymbolBalances: available, lockedSymbolBalances: locked } =
    usePortfolioSymbolBalances(balances)

  // calculate totals
  const { total, totalAvailable, totalLocked } = useMemo(() => {
    const { total, transferable, locked, reserved } = balances.sum.fiat(currency)
    return { total, totalAvailable: transferable, totalLocked: locked + reserved }
  }, [balances.sum, currency])

  // assume balance subscription is initializing if there are no balances
  if (!balances.count) return null

  if (!available.length && !locked.length)
    return (
      <FadeIn>
        <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
          {account ? t("No assets to display for this account.") : t("No assets to display.")}
        </div>
      </FadeIn>
    )

  return (
    <FadeIn>
      <div>
        {!!account && (
          <>
            <div className="text-md flex items-center gap-2">
              <div className="text-body grow text-left">{t("Total")}</div>
              <div className="text-body-secondary truncate">
                <Fiat amount={total} isBalance />
              </div>
            </div>
            <div className="h-8" />
          </>
        )}
        <BalancesGroup label={t("Available")} fiatAmount={totalAvailable}>
          {available.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} />
          ))}
          {!available.length && (
            <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
              {account
                ? t("There are no available balances for this account.")
                : t("There are no available balances.")}
            </div>
          )}
          <div className="h-8" />
        </BalancesGroup>
        <BalancesGroup
          label={
            <div className="flex items-center gap-2">
              <div>{t("Locked")}</div>
              <div>
                <LockIcon className="text-sm" />
              </div>
            </div>
          }
          fiatAmount={totalLocked}
        >
          {locked.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} locked />
          ))}
          {!locked.length && (
            <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
              {account
                ? t("There are no locked balances.")
                : t("There are no locked balances for this account.")}
            </div>
          )}
        </BalancesGroup>
      </div>
    </FadeIn>
  )
}
