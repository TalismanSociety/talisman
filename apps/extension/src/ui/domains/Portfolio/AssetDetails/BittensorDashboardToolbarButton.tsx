import type { Balances } from "@talismn/balances"
import { isAddressEqual } from "@talismn/crypto"
import { GaugeIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useAccounts } from "@ui/state/accounts"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { classNames } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
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

  const handleClick = useCallback(() => {
    if (IS_POPUP) {
      api.dashboardOpen("/bittensor")
    } else {
      navigate("/bittensor")
    }
  }, [navigate])

  if (!hasBittensorBalances) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={classNames(
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
