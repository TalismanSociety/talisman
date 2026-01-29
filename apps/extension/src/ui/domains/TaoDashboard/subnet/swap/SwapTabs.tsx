import type { FC } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { type TabConfig, TaoDashboardTabs } from "../../shared/TaoDashboardTabs"

const TAO_DASHBOARD_SWAP_TABS = ["buy", "sell"] as const

export type TaoDashboardSwapTabs = (typeof TAO_DASHBOARD_SWAP_TABS)[number]

export const SwapTabs: FC<{
  selected: TaoDashboardSwapTabs
  onSelect: (tab: TaoDashboardSwapTabs) => void
}> = ({ selected, onSelect }) => {
  const { t } = useTranslation()

  const tabs = useMemo<TabConfig<TaoDashboardSwapTabs>[]>(
    () => [
      { value: "buy", label: t("Buy"), selectedClassName: "border-buy text-buy" },
      { value: "sell", label: t("Sell"), selectedClassName: "border-sell text-sell" },
    ],
    [t]
  )

  return <TaoDashboardTabs tabs={tabs} selected={selected} onSelect={onSelect} />
}
