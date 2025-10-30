import { TokenId } from "@talismn/chaindata-provider"
import { ZapOffIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { formatDuration, intervalToDuration } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { BITTENSOR_TOKEN_ID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { useNomPoolStakingStatus } from "@ui/domains/Staking/hooks/nomPools/useNomPoolStakingStatus"
import { NomPoolWithdrawButton } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawButton"
import { NomPoolUnbondButton } from "@ui/domains/Staking/Unbond/NomPoolUnbondButton"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"

import { usePortfolioNavigation } from "../../usePortfolioNavigation"

type LockedExtraProps = {
  tokenId: TokenId
  address?: string
  isLoading: boolean
  rowMeta: { poolId?: number; unbonding?: boolean }
}

export const LockedExtra = ({ tokenId, address, rowMeta, isLoading }: LockedExtraProps) => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()
  const { data } = useNomPoolStakingStatus(tokenId)
  const { selectedAccount } = usePortfolioNavigation()

  const rowAddress = useMemo(
    () => address ?? selectedAccount?.address ?? null,
    [selectedAccount?.address, address],
  )

  const accountStatus = useMemo(
    () => data?.accounts?.find((s) => s.address === rowAddress),
    [rowAddress, data?.accounts],
  )

  const withdrawIn = useMemo(
    () =>
      !!rowMeta.unbonding && !!accountStatus?.canWithdrawIn
        ? formatDuration(intervalToDuration({ start: 0, end: accountStatus.canWithdrawIn }), {
            locale,
          })
        : null,
    [accountStatus?.canWithdrawIn, rowMeta.unbonding, locale],
  )

  const canUnbond = useMemo(
    () => (accountStatus?.canUnstake && rowMeta.poolId) || tokenId === BITTENSOR_TOKEN_ID,
    [accountStatus?.canUnstake, rowMeta.poolId, tokenId],
  )

  if (!rowAddress) return null

  return (
    <>
      {rowMeta.unbonding ? (
        accountStatus?.canWithdraw ? (
          <NomPoolWithdrawButton tokenId={tokenId} address={rowAddress} variant="small" />
        ) : (
          <Tooltip>
            <TooltipTrigger
              className={classNames(
                "text-body-secondary bg-body/10 h-10 rounded-sm px-3 text-xs opacity-60",
                isLoading && "animate-pulse",
              )}
            >
              <div className="flex items-center gap-2">
                <ZapOffIcon className="shrink-0 text-xs" />
                <div>{t("Unbonding")}</div>
              </div>
            </TooltipTrigger>
            {!!withdrawIn && (
              <TooltipContent>{t("{{duration}} left", { duration: withdrawIn })}</TooltipContent>
            )}
          </Tooltip>
        )
      ) : canUnbond ? (
        <NomPoolUnbondButton
          tokenId={tokenId}
          address={rowAddress}
          variant="small"
          poolId={rowMeta.poolId}
        />
      ) : null}
    </>
  )
}
