import type { Balances } from "@talismn/balances"
import { AssetPrice } from "@ui/domains/Asset/AssetPrice"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useSettingValue } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { AModeActivityPanel } from "./AModeActivityPanel"
import { AModeMiniPanel, AModeMiniPanelRow } from "./AModeMiniPanel"
import type { AModeShortcut } from "./types"
import { useAModeTopHoldings, useAModeTopNetworks } from "./useAModeMiniPanels"

const HoldingRow: FC<{ balances: Balances }> = ({ balances }) => {
  const navigate = useNavigateWithQuery()
  const { token, summary } = useTokenBalancesSummary(balances)
  if (!token || !summary) return null

  return (
    <AModeMiniPanelRow
      testId={`a-mode-holding-${token.symbol}`}
      onClick={() => navigate(`/portfolio/tokens/${encodeURIComponent(token.symbol)}`)}
    >
      <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
      <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
        <span className="truncate font-bold text-body">
          <TokenDisplaySymbol tokenId={token.id} />
        </span>
        <AssetPrice
          tokenId={token.id}
          balances={balances}
          noTooltip
          className="truncate text-body-secondary text-tiny"
        />
      </div>
      <div className="flex min-w-0 flex-col items-end leading-[1.3]">
        <Fiat amount={summary.totalFiat} isBalance noCountUp className="text-body" />
        <Tokens
          amount={summary.totalTokens}
          decimals={token.decimals}
          symbol={token.symbol}
          isBalance
          noCountUp
          noTooltip
          className="text-body-secondary text-tiny"
        />
      </div>
    </AModeMiniPanelRow>
  )
}

const HoldingsPanel = () => {
  const { t } = useTranslation()
  const holdings = useAModeTopHoldings()

  return (
    <AModeMiniPanel
      testId="a-mode-panel-holdings"
      title={t("Top holdings")}
      empty={
        holdings.length ? undefined : t("No tokens yet. Receive or buy some to see them here.")
      }
    >
      {holdings.map((balances) => (
        <HoldingRow key={balances.each[0]?.tokenId} balances={balances} />
      ))}
    </AModeMiniPanel>
  )
}

const NetworksPanel: FC<{ manageNetworks?: AModeShortcut }> = ({ manageNetworks }) => {
  const { t } = useTranslation()
  const { networks, enabledCount } = useAModeTopNetworks()
  const hideBalances = useSettingValue("hideBalances")
  const open = () => manageNetworks?.onClick()

  return (
    <AModeMiniPanel
      testId="a-mode-panel-networks"
      title={t("Networks")}
      meta={t("{{count}} enabled", { count: enabledCount })}
      action={manageNetworks && { label: t("Manage"), onClick: open }}
      empty={networks.length ? undefined : t("No funds on any network yet.")}
    >
      {networks.map((network) => (
        <AModeMiniPanelRow
          key={network.networkId}
          testId={`a-mode-network-${network.networkId}`}
          onClick={open}
          className="h-auto flex-col items-stretch gap-1 py-2"
        >
          <span className="flex min-w-0 items-center gap-3">
            <NetworkLogo networkId={network.networkId} className="shrink-0 text-md" />
            <span className="min-w-0 flex-1 truncate text-body">{network.name}</span>
            <Fiat amount={network.fiat} isBalance noCountUp className="text-body-secondary" />
          </span>
          <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-grey-800">
            <span
              className={cn("block h-full rounded-full bg-primary/70", hideBalances && "invisible")}
              style={{ width: `${Math.max(network.share * 100, 2)}%` }}
            />
          </span>
        </AModeMiniPanelRow>
      ))}
    </AModeMiniPanel>
  )
}

export const AModeMiniPanels: FC<{
  byId: Readonly<Record<string, AModeShortcut>>
  className?: string
}> = ({ byId, className }) => (
  <div className={cn("grid gap-4", className)} data-testid="a-mode-mini-panels">
    <HoldingsPanel />
    <NetworksPanel manageNetworks={byId["manage-networks"]} />
    <AModeActivityPanel activity={byId.activity} />
  </div>
)
