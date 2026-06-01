import { isAccountOwned } from "@core/domains/keyring/exports"
import { ChevronLeftIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { IconButton } from "@ui/components/IconButton"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { EarnTypeBadge } from "../components/EarnTypeBadge"
import {
  getSeekPositionValueUsd,
  useSeekStakingConfig,
  useSeekStakingMetadata,
  useSeekStakingPosition,
} from "./useSeekStaking"
import { useSeekStakingModal } from "./useSeekStakingModal"

export const SeekStakingPositionPage: FC<{ address: string }> = ({ address }) => {
  const config = useSeekStakingConfig()
  const token = useToken(config.tokenId)
  const tokenRatesMap = useTokenRatesMap()
  const position = useSeekStakingPosition(address)
  const account = useAccountByAddress(address)
  const metadata = useSeekStakingMetadata()
  const totalUsd = useMemo(
    () =>
      position.data
        ? getSeekPositionValueUsd(position.data, token, tokenRatesMap[config.tokenId]?.usd?.price)
        : 0,
    [config.tokenId, position.data, token, tokenRatesMap]
  )

  if (!token) return null

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      <SeekPositionHeader address={address} totalUsd={totalUsd} />
      <div className="flex flex-col gap-0 overflow-hidden rounded bg-grey-850 px-10">
        <div className="flex h-20 w-full items-center truncate font-bold">SEEK Staking</div>
        <SeekBalanceRow label="Staked" tokenId={token.id} planck={position.data?.staked ?? 0n} />
        <SeekBalanceRow label="Rewards" tokenId={token.id} planck={position.data?.earned ?? 0n} />
        <SeekBalanceRow
          label="Pending unstake"
          tokenId={token.id}
          planck={position.data?.pendingWithdrawal.amount ?? 0n}
          subtitle={
            position.data?.pendingWithdrawal.amount
              ? unlockLabel(Number(position.data.pendingWithdrawal.unlockTimestamp))
              : undefined
          }
        />
      </div>
      {metadata.data?.apr != null && (
        <div className="rounded bg-grey-850 p-8 text-sm">
          <div className="text-body-secondary">APR</div>
          <div className="mt-2 font-bold text-primary">{metadata.data.apr.toFixed(2)}%</div>
        </div>
      )}
      {isAccountOwned(account) && (
        <SeekPositionActions address={address} position={position.data ?? null} />
      )}
    </div>
  )
}

const SeekPositionHeader: FC<{ address: string; totalUsd: number }> = ({ address, totalUsd }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()
  const config = useSeekStakingConfig()

  return (
    <div className="flex h-28 w-full items-center gap-8 overflow-hidden">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate("/earn/positions", true)}>
          <ChevronLeftIcon />
        </IconButton>
        <TokenLogo tokenId={config.tokenId} className="size-[2.25rem]" />
        <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
          <div className="flex w-full items-center gap-8 overflow-hidden">
            <div className="flex grow items-center gap-2 overflow-hidden truncate text-body">
              <div className="truncate">SEEK Staking</div>
              <NetworkLogo networkId={config.networkId} className="size-[1.2em]" />
              <NetworkName
                networkId={config.networkId}
                className="truncate text-body-secondary text-sm"
              />
              <EarnTypeBadge className={cn("shrink-0", IS_POPUP && "hidden")}>
                {t("staking")}
              </EarnTypeBadge>
            </div>
            <div className="shrink-0 text-body-secondary">{t("Total")}</div>
          </div>
          <div className="flex w-full items-center gap-8 overflow-hidden text-sm">
            <div className="grow truncate text-body-secondary">
              <PortfolioAccount address={address} />
            </div>
            <div className="shrink-0">
              <FiatFromUsd amount={totalUsd} isBalance />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SeekBalanceRow: FC<{
  label: string
  tokenId: string
  planck: bigint
  subtitle?: string
}> = ({ label, tokenId, planck, subtitle }) => (
  <div className="flex h-28 w-full shrink-0 items-center gap-8 border-grey-800 border-t">
    <TokenLogo tokenId={tokenId} className="size-16 shrink-0" />
    <div className="flex grow flex-col justify-center gap-1 overflow-hidden text-sm">
      <div className="text-body-secondary">{label}</div>
      {subtitle && <div className="text-body-disabled text-xs">{subtitle}</div>}
    </div>
    <TokensAndFiat tokenId={tokenId} planck={planck.toString()} isBalance />
  </div>
)

const SeekPositionActions: FC<{
  address: string
  position: NonNullable<ReturnType<typeof useSeekStakingPosition>["data"]> | null
}> = ({ address, position }) => {
  const { t } = useTranslation()
  const { open } = useSeekStakingModal()
  const pendingAmount = position?.pendingWithdrawal.amount ?? 0n
  const hasPending = pendingAmount > 0n
  const isUnlocked =
    hasPending && Number(position?.pendingWithdrawal.unlockTimestamp ?? 0n) * 1000 <= Date.now()

  return (
    <div className="grid grid-cols-2 gap-4">
      <Button primary onClick={() => open({ action: "stake", address })}>
        {t("Stake")}
      </Button>
      <Button
        onClick={() => open({ action: "requestWithdrawal", address })}
        disabled={!position?.staked || hasPending}
      >
        {t("Unstake")}
      </Button>
      <Button onClick={() => open({ action: "getReward", address })} disabled={!position?.earned}>
        {t("Claim Rewards")}
      </Button>
      {hasPending && isUnlocked ? (
        <Button primary onClick={() => open({ action: "completeWithdrawal", address })}>
          {t("Complete Unstake")}
        </Button>
      ) : (
        <Button
          onClick={() => open({ action: "cancelWithdrawal", address })}
          disabled={!hasPending}
        >
          {t("Cancel Unstake")}
        </Button>
      )}
    </div>
  )
}

const unlockLabel = (unlockTimestamp: number) => {
  if (!unlockTimestamp) return undefined
  const unlockDate = new Date(unlockTimestamp * 1000)
  if (unlockDate.getTime() <= Date.now()) return "Ready to complete"
  return `Unlocks ${unlockDate.toLocaleString()}`
}
