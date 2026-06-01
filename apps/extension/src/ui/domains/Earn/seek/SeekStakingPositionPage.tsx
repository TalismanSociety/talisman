import { isAccountOwned } from "@core/domains/keyring/exports"
import type { Token } from "@talismn/chaindata-provider"
import { ChevronLeftIcon, MoreHorizontalIcon, ZapPlusIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { IconButton } from "@ui/components/IconButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, type ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { formatUnits } from "viem"

import { EarnTypeBadge } from "../components/EarnTypeBadge"
import {
  getSeekPositionValueUsd,
  SEEK_PROVIDER_LOGO_URI,
  useSeekStakingConfig,
  useSeekStakingPosition,
} from "./useSeekStaking"
import { useSeekStakingModal } from "./useSeekStakingModal"

export const SeekStakingPositionPage: FC<{ address: string }> = ({ address }) => {
  const { t } = useTranslation()
  const config = useSeekStakingConfig()
  const token = useToken(config.tokenId)
  const tokenRatesMap = useTokenRatesMap()
  const position = useSeekStakingPosition(address)
  const account = useAccountByAddress(address)
  const isOwned = isAccountOwned(account)
  const tokenUsd = tokenRatesMap[config.tokenId]?.usd?.price
  const totalUsd = useMemo(
    () => (position.data ? getSeekPositionValueUsd(position.data, token, tokenUsd) : 0),
    [position.data, token, tokenUsd]
  )

  if (!token) return null

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      <SeekNavHeader address={address} totalUsd={totalUsd} />
      <SeekPositionHeader
        address={address}
        token={token}
        position={position.data ?? null}
        isOwned={isOwned}
      />
      <SeekBalanceGroup label={t("Supplied")}>
        <SeekBalanceRow
          label={t("Staked")}
          token={token}
          tokenUsd={tokenUsd}
          planck={position.data?.staked ?? 0n}
          isLoading={position.isFetching}
        />
        {!!position.data?.pendingWithdrawal.amount && (
          <SeekBalanceRow
            label={t("Pending unstake")}
            token={token}
            tokenUsd={tokenUsd}
            planck={position.data.pendingWithdrawal.amount}
            subtitle={unlockLabel(Number(position.data.pendingWithdrawal.unlockTimestamp), t)}
            isLoading={position.isFetching}
          />
        )}
      </SeekBalanceGroup>
      <SeekBalanceGroup label={t("Rewards")}>
        <SeekBalanceRow
          label={t("Claimable")}
          token={token}
          tokenUsd={tokenUsd}
          planck={position.data?.earned ?? 0n}
          isLoading={position.isFetching}
        />
      </SeekBalanceGroup>
      <SeekPositionActions address={address} position={position.data ?? null} isOwned={isOwned} />
    </div>
  )
}

const SeekNavHeader: FC<{ address: string; totalUsd: number }> = ({ address, totalUsd }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()

  return (
    <div className="flex h-28 w-full items-center gap-8 overflow-hidden">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate("/earn/positions", true)}>
          <ChevronLeftIcon />
        </IconButton>
        <AssetLogo url={SEEK_PROVIDER_LOGO_URI} className="size-[2.25rem]" />
        <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
          <div className="flex w-full items-center gap-8 overflow-hidden">
            <div className="flex grow items-center gap-2 overflow-hidden truncate text-body">
              <div className="truncate">SEEK Staking</div>
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

const SeekPositionHeader: FC<{
  address: string
  token: Token
  position: NonNullable<ReturnType<typeof useSeekStakingPosition>["data"]> | null
  isOwned: boolean
}> = ({ address, token, position, isOwned }) => {
  const config = useSeekStakingConfig()

  return (
    <div className="flex h-32 w-full items-center gap-8 rounded bg-grey-800 px-10">
      <TokenLogo tokenId={token.id} className="size-16 shrink-0" />
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="truncate font-bold text-base text-body">
          {token.name || <TokenDisplaySymbol tokenId={token.id} />}
        </div>
        <div className="flex max-w-full items-center gap-[0.3em] overflow-hidden text-body-secondary">
          <NetworkLogo networkId={config.networkId} className="size-8 shrink-0" />
          <NetworkName networkId={config.networkId} className="truncate text-sm" />
        </div>
      </div>
      <AddStakeButton address={address} disabled={!isOwned} />
      <SeekPositionContextMenuButton address={address} position={position} isOwned={isOwned} />
    </div>
  )
}

const AddStakeButton: FC<{ address: string; disabled: boolean }> = ({ address, disabled }) => {
  const { t } = useTranslation()
  const { open } = useSeekStakingModal()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => open({ action: "stake", address })}
          disabled={disabled}
          className={cn(
            "flex size-9.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[1.25rem] text-primary hover:bg-primary/20",
            disabled && "cursor-not-allowed opacity-50 hover:bg-primary/10"
          )}
        >
          <ZapPlusIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Add stake")}</TooltipContent>
    </Tooltip>
  )
}

const SeekBalanceGroup: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0 overflow-hidden rounded bg-grey-850 px-10">
    <div className="flex h-20 w-full items-center truncate font-bold">{label}</div>
    <div>{children}</div>
  </div>
)

const SeekBalanceRow: FC<{
  label: string
  token: Token
  tokenUsd: number | undefined
  planck: bigint
  subtitle?: string
  isLoading: boolean
}> = ({ label, token, tokenUsd, planck, subtitle, isLoading }) => {
  const amount = useMemo(() => formatUnits(planck, token.decimals), [planck, token.decimals])
  const fiat = useMemo(
    () => (tokenUsd !== undefined ? Number(amount) * tokenUsd : null),
    [amount, tokenUsd]
  )

  return (
    <div className="flex h-32 w-full shrink-0 items-center gap-8">
      <TokenLogo tokenId={token.id} className="size-16 shrink-0" />
      <div className="flex grow flex-col justify-center gap-1 overflow-hidden text-sm">
        <div className="flex w-full justify-between overflow-hidden font-bold text-body">
          <div>{label}</div>
          <div className={cn(isLoading && "animate-pulse")}>
            <Tokens amount={amount} noCountUp symbol={token.symbol} />
          </div>
        </div>
        <div className="flex w-full justify-between overflow-hidden text-body-secondary text-sm">
          <div>{subtitle}</div>
          <div className={cn(isLoading && "animate-pulse")}>
            {fiat !== null ? <FiatFromUsd amount={fiat} noCountUp /> : "-"}
          </div>
        </div>
      </div>
    </div>
  )
}

const SeekPositionContextMenuButton: FC<{
  address: string
  position: NonNullable<ReturnType<typeof useSeekStakingPosition>["data"]> | null
  isOwned: boolean
}> = ({ address, position, isOwned }) => {
  const { t } = useTranslation()
  const actions = useSeekPositionActions(address, position, isOwned)

  return (
    <ContextMenu placement="bottom-end">
      <ContextMenuTrigger asChild>
        <IconButton>
          <MoreHorizontalIcon />
        </IconButton>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={!actions.canStake} onClick={actions.onStake}>
          {t("Add stake")}
        </ContextMenuItem>
        <ContextMenuItem disabled={!actions.canUnstake} onClick={actions.onUnstake}>
          {t("Unstake")}
        </ContextMenuItem>
        <ContextMenuItem disabled={!actions.canCompleteUnstake} onClick={actions.onCompleteUnstake}>
          {t("Complete unstake")}
        </ContextMenuItem>
        <ContextMenuItem disabled={!actions.canCancelUnstake} onClick={actions.onCancelUnstake}>
          {t("Cancel unstake")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

const SeekPositionActions: FC<{
  address: string
  position: NonNullable<ReturnType<typeof useSeekStakingPosition>["data"]> | null
  isOwned: boolean
}> = ({ address, position, isOwned }) => {
  const { t } = useTranslation()
  const { canClaimRewards, onClaimRewards } = useSeekPositionActions(address, position, isOwned)

  return (
    <div className="flex w-full justify-end gap-8 overflow-hidden">
      <Button
        primary
        onClick={onClaimRewards}
        disabled={!canClaimRewards}
        className={cn("text-base", !IS_POPUP && "w-43.75", IS_POPUP && "w-full")}
      >
        {t("Claim Rewards")}
      </Button>
    </div>
  )
}

const useSeekPositionActions = (
  address: string,
  position: NonNullable<ReturnType<typeof useSeekStakingPosition>["data"]> | null,
  isOwned: boolean
) => {
  const { open } = useSeekStakingModal()
  const pendingAmount = position?.pendingWithdrawal.amount ?? 0n
  const hasPending = pendingAmount > 0n
  const isUnlocked =
    hasPending && Number(position?.pendingWithdrawal.unlockTimestamp ?? 0n) * 1000 <= Date.now()

  const canStake = isOwned
  const canUnstake = isOwned && !!position?.staked && !hasPending
  const canCompleteUnstake = isOwned && hasPending && isUnlocked
  const canCancelUnstake = isOwned && hasPending
  const canClaimRewards = isOwned && !!position?.earned

  const onStake = useCallback(() => open({ action: "stake", address }), [address, open])
  const onUnstake = useCallback(
    () => open({ action: "requestWithdrawal", address }),
    [address, open]
  )
  const onCompleteUnstake = useCallback(
    () => open({ action: "completeWithdrawal", address }),
    [address, open]
  )
  const onCancelUnstake = useCallback(
    () => open({ action: "cancelWithdrawal", address }),
    [address, open]
  )
  const onClaimRewards = useCallback(() => open({ action: "getReward", address }), [address, open])

  return {
    canStake,
    canUnstake,
    canCompleteUnstake,
    canCancelUnstake,
    canClaimRewards,
    onStake,
    onUnstake,
    onCompleteUnstake,
    onCancelUnstake,
    onClaimRewards,
  }
}

const unlockLabel = (unlockTimestamp: number, t: ReturnType<typeof useTranslation>["t"]) => {
  if (!unlockTimestamp) return undefined
  const unlockDate = new Date(unlockTimestamp * 1000)
  if (unlockDate.getTime() <= Date.now()) return t("Ready to complete")
  return t("Unlocks {{date}}", { date: unlockDate.toLocaleString() })
}
