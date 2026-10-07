import { BalanceFormatter } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import {
  ChevronLeftIcon,
  CoinsHandIcon,
  LockIcon,
  MoreHorizontalIcon,
  ZapOffIcon,
  ZapPlusIcon,
} from "@talismn/icons"
import { track } from "@ui/api/track"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { IconButton } from "@ui/components/IconButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { BittensorHotkeyAvatar } from "@ui/domains/Staking/Bittensor/components/BittensorHotkeyAvatar"
import { useDTaoRootStakeHoldGate } from "@ui/domains/Staking/Bittensor/hooks/dTao/useDTaoRootStakeHold"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useBalance } from "@ui/state/balances"
import { type FC, type ReactNode, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { formatAprPercent } from "../shared/formatAprPercent"
import {
  type BittensorStakePosition,
  getBittensorLockLabel,
  getBittensorPositionTitle,
  getBittensorValidatorLabel,
} from "./bittensorStakePosition"
import {
  type BittensorPositionActions,
  useBittensorPositionActions,
} from "./useBittensorPositionActions"
import { useBittensorPositionsApy } from "./useBittensorPositionsApy"
import { useBittensorStakePosition } from "./useBittensorStakePositions"

export const BittensorStakingPositionPage: FC<{ tokenId: TokenId; address: string }> = ({
  tokenId,
  address,
}) => {
  const { t } = useTranslation()
  useEffect(() => {
    track("earn_position_opened", { system: "bittensor", yield_id: null })
  }, [])
  const position = useBittensorStakePosition(tokenId, address)

  if (!position)
    return (
      <div className="flex w-full flex-col gap-6 overflow-hidden">
        <BackButton />
        <div className="py-24 text-center text-body-secondary">{t("No position found")}</div>
      </div>
    )

  return <BittensorStakingPosition position={position} />
}

const BittensorStakingPosition: FC<{ position: BittensorStakePosition }> = ({ position }) => {
  const getActions = useBittensorPositionActions()
  const actions = useMemo(() => getActions(position), [getActions, position])
  const positions = useMemo(() => [position], [position])
  const apy = useBittensorPositionsApy(positions)(position)

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      <NavHeader position={position} />
      <PositionCard position={position} actions={actions} />
      <StakedBalanceCard position={position} apy={apy} />
      {position.kind === "root" && <ClaimableRewardsCard position={position} actions={actions} />}
    </div>
  )
}

const BackButton = () => {
  const navigate = useNavigateWithQuery()

  return (
    <IconButton onClick={() => navigate("/earn/positions", true)}>
      <ChevronLeftIcon />
    </IconButton>
  )
}

const NavHeader: FC<{ position: BittensorStakePosition }> = ({ position }) => {
  const { t } = useTranslation()

  return (
    <div className="flex h-28 w-full items-center gap-8 overflow-hidden">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <BackButton />
        <TokenLogo tokenId={position.groupTokenId} className="size-[2.25rem] shrink-0" />
        <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
          <div className="flex w-full items-center gap-8 overflow-hidden">
            <div className="flex grow items-center gap-2 overflow-hidden text-body">
              <div className="truncate">{getBittensorPositionTitle(position, t)}</div>
              <NetworkLogo networkId={position.networkId} className="size-[1.2em] shrink-0" />
            </div>
            <div className="shrink-0 text-body-secondary">{t("Total")}</div>
          </div>
          <div className="flex w-full items-center gap-8 overflow-hidden text-sm">
            <div className="grow truncate text-body-secondary">
              <PortfolioAccount address={position.address} />
            </div>
            <div className="shrink-0">
              <FiatFromUsd amount={position.totalUsd} isBalance />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const PositionCard: FC<{ position: BittensorStakePosition; actions: BittensorPositionActions }> = ({
  position,
  actions,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex h-32 w-full items-center gap-6 rounded bg-grey-800 px-10">
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="truncate font-bold text-base text-body">
          {position.kind === "root" ? t("Root TAO Staking") : t("dTAO Staking")}
        </div>
        <div className="flex items-center gap-2 overflow-hidden text-body-secondary text-sm">
          <BittensorHotkeyAvatar hotkey={position.hotkey} className="shrink-0" />
          <span className="truncate">{getBittensorValidatorLabel(position)}</span>
        </div>
      </div>
      <RoundIconButton label={t("Stake")} action={actions.stake}>
        <ZapPlusIcon />
      </RoundIconButton>
      <RoundIconButton label={t("Unstake")} action={actions.unstake}>
        <ZapOffIcon />
      </RoundIconButton>
      <PositionContextMenu position={position} actions={actions} />
    </div>
  )
}

const RoundIconButton: FC<{
  label: string
  action: BittensorPositionActions[keyof BittensorPositionActions]
  children: ReactNode
}> = ({ label, action, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={action.run}
        disabled={!action.isAvailable}
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[1.25rem] text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10"
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)

const PositionContextMenu: FC<{
  position: BittensorStakePosition
  actions: BittensorPositionActions
}> = ({ position, actions }) => {
  const { t } = useTranslation()

  return (
    <ContextMenu placement="bottom-end">
      <ContextMenuTrigger asChild>
        <IconButton>
          <MoreHorizontalIcon />
        </IconButton>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {actions.changeValidator.isAvailable && (
          <ContextMenuItem onClick={actions.changeValidator.run}>
            {t("Change Validator")}
          </ContextMenuItem>
        )}
        {actions.claim.isAvailable && (
          <ContextMenuItem onClick={actions.claim.run}>
            <div className="flex w-full items-center justify-between gap-8">
              <span>{t("Claim")}</span>
              <span className="text-body-secondary text-xs">
                <Tokens
                  amount={new BalanceFormatter(position.claimable, position.token.decimals).tokens}
                  symbol={position.token.symbol}
                  noCountUp
                />
              </span>
            </div>
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={actions.viewDetails.run}>{t("View details")}</ContextMenuItem>
        {actions.createLock.isAvailable && (
          <ContextMenuItem onClick={actions.createLock.run}>
            {t("Create conviction lock")}
          </ContextMenuItem>
        )}
        {actions.changeLockType.isAvailable && (
          <ContextMenuItem onClick={actions.changeLockType.run}>
            {t("Change Conviction Lock Type")}
          </ContextMenuItem>
        )}
        {actions.changeLockHotkey.isAvailable && (
          <ContextMenuItem onClick={actions.changeLockHotkey.run}>
            {t("Change Conviction Lock Hotkey")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

const BalanceCard: FC<{ label: string; badge?: ReactNode; children: ReactNode }> = ({
  label,
  badge,
  children,
}) => (
  <div className="flex flex-col overflow-hidden rounded bg-grey-850 px-10">
    <div className="flex h-20 w-full items-center justify-between gap-4 font-bold">
      <span className="truncate">{label}</span>
      {badge}
    </div>
    {children}
  </div>
)

const BalanceRow: FC<{
  position: BittensorStakePosition
  planck: bigint
  usd: number
  lockLabel?: string | null
  action?: ReactNode
}> = ({ position, planck, usd, lockLabel, action }) => (
  <div className="flex h-32 w-full shrink-0 items-center gap-8">
    <TokenLogo tokenId={position.groupTokenId} className="size-16 shrink-0" />
    <div className="grow truncate font-bold text-body text-sm">
      <TokenDisplaySymbol tokenId={position.groupTokenId} />
    </div>
    {action}
    <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
      <div className="flex items-center gap-2 font-bold text-body">
        <Tokens
          amount={new BalanceFormatter(planck, position.token.decimals).tokens}
          symbol={position.token.symbol}
          noCountUp
          isBalance
        />
        {lockLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex shrink-0 text-body-secondary">
                <LockIcon />
              </span>
            </TooltipTrigger>
            <TooltipContent>{lockLabel}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="text-body-secondary">
        <FiatFromUsd amount={usd} noCountUp isBalance />
      </div>
    </div>
  </div>
)

const StakedBalanceCard: FC<{ position: BittensorStakePosition; apy: number | null }> = ({
  position,
  apy,
}) => {
  const { t } = useTranslation()
  const balance = useBalance(position.address, position.tokenId)
  const rootStakeHold = useDTaoRootStakeHoldGate(position.kind === "root" ? balance : null)

  const lockLabel =
    position.kind === "root"
      ? rootStakeHold.message
      : position.lock && getBittensorLockLabel(position.lock, position.token, t)

  return (
    <BalanceCard
      label={t("Staked balance")}
      badge={
        apy !== null && (
          <span className="shrink-0 rounded-full bg-primary/10 px-4 py-1 font-normal text-primary text-sm">
            {t("APY {{percent}}", { percent: formatAprPercent(apy) })}
          </span>
        )
      }
    >
      <BalanceRow
        position={position}
        planck={position.stake}
        usd={position.stakeUsd}
        lockLabel={lockLabel}
      />
    </BalanceCard>
  )
}

const ClaimableRewardsCard: FC<{
  position: BittensorStakePosition
  actions: BittensorPositionActions
}> = ({ position, actions }) => {
  const { t } = useTranslation()

  return (
    <BalanceCard label={t("Claimable Rewards")}>
      <BalanceRow
        position={position}
        planck={position.claimable}
        usd={position.claimableUsd}
        action={
          actions.claim.isAvailable && (
            <button
              type="button"
              onClick={actions.claim.run}
              className="flex h-14 shrink-0 items-center gap-2 rounded-full bg-grey-800 px-6 text-primary text-sm hover:bg-grey-750"
            >
              <CoinsHandIcon />
              {t("Claim")}
            </button>
          )
        }
      />
    </BalanceCard>
  )
}
