import { TokenId } from "@talismn/chaindata-provider"
import { ZapOffIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { formatDuration, intervalToDuration } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

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
    [data?.accounts, rowAddress],
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
    () => accountStatus?.canUnstake && rowMeta.poolId,
    [accountStatus?.canUnstake, rowMeta.poolId],
  )

  if (!rowAddress) return null

  return (
    <div className="flex h-[6.6rem] flex-col items-end justify-center gap-2 whitespace-nowrap p-8 text-right">
      {rowMeta.unbonding ? (
        accountStatus?.canWithdraw ? (
          <NomPoolWithdrawButton tokenId={tokenId} address={rowAddress} variant="large" />
        ) : (
          <>
            <div className={classNames(isLoading && "animate-pulse transition-opacity")}>
              <div className="flex items-center gap-2">
                <ZapOffIcon className="shrink-0 text-sm" />
                <div>{t("Unbonding")}</div>
              </div>
            </div>
            {!!withdrawIn && (
              <div className="text-body-500 text-sm">
                {t("{{duration}} left", { duration: withdrawIn })}
              </div>
            )}
          </>
        )
      ) : canUnbond ? (
        <NomPoolUnbondButton
          tokenId={tokenId}
          address={rowAddress}
          variant="large"
          poolId={rowMeta.poolId}
        />
      ) : null}
    </div>
  )
}
