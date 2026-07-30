import type { Balances } from "@talismn/balances"
import { isTokenOfType, type SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { GaugeIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useDefaultTaoDashboardNetworkId } from "@ui/domains/TaoDashboard/hooks/useIsBittensorEnabled"
import { getTaoDashboardUrl } from "@ui/domains/TaoDashboard/shared/util"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useAccounts } from "@ui/state/accounts"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { uniq } from "lodash"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const BittensorDashboardToolbarButton: FC<{ balances: Balances; className?: string }> = ({
  balances,
  className,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const accounts = useAccounts("owned")

  const hasBittensorBalances = useMemo(() => {
    return balances.each.some(
      (b) =>
        bittensorNetworkIds.includes(b.networkId) &&
        accounts.some((a) => isAddressEqual(a.address, b.address))
    )
  }, [accounts, balances, bittensorNetworkIds])

  const defaultNetworkId = useDefaultTaoDashboardNetworkId()

  // guess the network and netuid based on the page's balances.
  // if any doubt, fall back to the default network / subnets list
  const target = useMemo(() => {
    const bittensorTokens = balances.each
      .map((b) => b.token)
      .filter((t) => !!t && bittensorNetworkIds.includes(t.networkId))
    const networkIds = uniq(bittensorTokens.map((t) => t?.networkId))
    const networkId = networkIds.length === 1 ? networkIds[0] : defaultNetworkId
    const netuids = uniq(
      bittensorTokens
        .filter(
          (t): t is SubDTaoToken =>
            isTokenOfType(t, "substrate-dtao") && t.networkId === networkId && !!t.netuid // ignore root (0)
        )
        .map((t) => t.netuid)
    )
    return { networkId, netuid: netuids.length === 1 ? netuids[0] : null }
  }, [balances, bittensorNetworkIds, defaultNetworkId])

  const handleClick = useCallback(() => {
    if (!target.networkId) return
    const url = getTaoDashboardUrl(target.networkId, target.netuid ?? undefined)
    if (IS_POPUP) {
      api.dashboardOpen(url)
    } else {
      navigate(url)
    }
  }, [navigate, target])

  if (!hasBittensorBalances) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex h-16 items-center gap-2 rounded-sm border border-transparent bg-grey-900 p-4 text-primary hover:bg-grey-800",
            "ring-transparent focus-visible:border-grey-700",
            className
          )}
        >
          <GaugeIcon />
          <span className="whitespace-nowrap text-sm leading-paragraph">{t("Dashboard")}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("TAO Dashboard")}</TooltipContent>
    </Tooltip>
  )
}
