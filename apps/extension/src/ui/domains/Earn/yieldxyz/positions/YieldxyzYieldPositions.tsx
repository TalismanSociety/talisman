import { ChevronLeftIcon, MoreHorizontalIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { BalanceDto, YieldDto } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  IconButton,
} from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import {
  useYieldNetworkIdToTalismanNetworkIdMap,
  useYieldxyzProduct,
  YieldxyzPositionEnhanced,
} from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { EarnTypeBadge } from "../../components/EarnTypeBadge"
import { YieldxyzBalanceTypeDisplay } from "../components/YieldxyzBalanceTypeDisplay"
import { YieldxyzProviderLogo } from "../components/YieldxyzProviderLogo"
import { useYieldxyzEnterModal } from "../enter/useYieldxyzEnterModal"
import { useYieldxyzExitModal } from "../exit/useYieldxyzExitModal"
import { useGetYieldxyzToken } from "../hooks/useGetYieldxyzToken"
import { useYieldxyzYieldPositions } from "../hooks/useYieldxyzYieldPositions"
import { useYieldxyzManageModal } from "../manage/useYieldxyzManageModal"

/**
 * ⚠️ yield.xyz api returns 1/n positions for a given yield and an address. Also, returned positions dont have an id.
 * => we need to display n positions on this page.
 */
export const YieldxyzYieldPositions: FC<{ yieldId: string; address: string }> = ({
  yieldId,
  address,
}) => {
  const { data: product } = useYieldxyzProduct(yieldId)
  const { status, data: positions } = useYieldxyzYieldPositions(yieldId, address)

  useEffect(() => {
    log.debug("[earn] YieldxyzYieldPositions", { positions })
  }, [positions])

  if (!product) return null

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      <NavHeader
        isLoading={status === "loading"}
        address={address}
        product={product}
        positions={positions}
      />
      <div className="bg-grey-900 text-body-secondary rounded p-10">
        DEV NOTE Here we should display APY, lockdown mechanisms
      </div>
      {positions?.map((position, index) => (
        <Position key={index} position={position} isLoading={status === "loading"} />
      ))}
    </div>
  )
}

const NavHeader: FC<{
  address: string
  product: YieldDto
  positions: YieldxyzPositionEnhanced[] | undefined
  isLoading: boolean
}> = ({ address, product, positions }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()
  const totalUsd = useMemo(
    () => positions?.reduce((acc, position) => acc + position.totalAmountUsd, 0),
    [positions],
  )

  return (
    <div className="flex h-28 w-full items-center gap-8 overflow-hidden">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate("/earn", true)}>
          <ChevronLeftIcon />
        </IconButton>
        <YieldxyzProviderLogo providerId={product.providerId} className="size-[3.6rem]" />

        <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
          <div className="flex w-full items-center gap-8 overflow-hidden">
            <div className="text-body flex grow items-center overflow-hidden truncate">
              <div className="truncate">{product.metadata.name}</div>
              <EarnTypeBadge className="shrink-0 text-xs">{product.mechanics?.type}</EarnTypeBadge>
            </div>
            <div className="text-body-secondary shrink-0">{t("Total")}</div>
          </div>
          <div className="flex w-full items-center gap-8 overflow-hidden text-sm">
            <div className="text-body-secondary grow truncate">
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

const Position: FC<{ position: YieldxyzPositionEnhanced; isLoading: boolean }> = ({
  position,
  isLoading,
}) => {
  const { t } = useTranslation()

  const { supplied, rewards } = useMemo(() => {
    return position.balances.reduce<{
      supplied: BalanceDto[]
      rewards: BalanceDto[]
    }>(
      (acc, balance) => {
        if (balance.type === "claimable") {
          acc.rewards.push(balance)
        } else {
          acc.supplied.push(balance)
        }
        return acc
      },
      { supplied: [], rewards: [] },
    )
  }, [position.balances])

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      <PositionHeader position={position} />
      <PositionBalancesGroup label={t("Supplied")} balances={supplied} isLoading={isLoading} />
      <PositionBalancesGroup label={t("Rewards")} balances={rewards} isLoading={isLoading} />
      <PositionActions position={position} />
    </div>
  )
}

const PositionBalancesGroup: FC<{ label: string; balances: BalanceDto[]; isLoading: boolean }> = ({
  label,
  balances,
}) => {
  if (!balances.length) return null

  return (
    <div className="bg-grey-850 flex flex-col gap-0 overflow-hidden rounded px-10">
      <div className="flex h-20 w-full items-center truncate font-bold">{label}</div>
      <div>
        {balances.map((balance, index) => (
          <PositionBalancesGroupRow key={index} balance={balance} isLoading={false} />
        ))}
      </div>
    </div>
  )
}

const PositionBalancesGroupRow: FC<{ balance: BalanceDto; isLoading: boolean }> = ({
  balance,
  isLoading,
}) => {
  const { getYieldxyzToken } = useGetYieldxyzToken()
  const token = useMemo(() => getYieldxyzToken(balance.token), [balance.token, getYieldxyzToken])

  return (
    <div className="flex h-32 w-full shrink-0 items-center gap-8">
      {token ? (
        <TokenLogo tokenId={token?.id} className="size-16 shrink-0" />
      ) : (
        <AssetLogo className="size-16 shrink-0" url={balance.token.logoURI} />
      )}
      <div className="flex grow flex-col justify-center gap-1 overflow-hidden">
        <div className="text-body flex w-full justify-between overflow-hidden font-bold">
          <div>{token ? <TokenDisplaySymbol tokenId={token.id} /> : balance.token.symbol}</div>
          <div className={cn(isLoading && "animate-pulse")}>
            <Tokens amount={balance.amount} decimals={balance.token.decimals} noCountUp />{" "}
            {balance.token.symbol}
          </div>
        </div>
        <div className="text-body-secondary flex w-full justify-between overflow-hidden text-sm">
          <div>
            <YieldxyzBalanceTypeDisplay balance={balance} />
          </div>
          <div className={cn(isLoading && "animate-pulse")}>
            {balance.amountUsd ? <FiatFromUsd amount={Number(balance.amountUsd)} noCountUp /> : "-"}
          </div>
        </div>
      </div>
    </div>
  )
}

const PositionHeader: FC<{ position: YieldxyzPositionEnhanced }> = ({ position }) => {
  const toTalismanNetworkId = useYieldNetworkIdToTalismanNetworkIdMap()

  const networkId = useMemo(
    () => toTalismanNetworkId[position.product.network],
    [position.product.network, toTalismanNetworkId],
  )

  const productTokens = useMemo(() => {
    return position.product.token.name ?? position.product.token.symbol
  }, [position.product.token.name, position.product.token.symbol])

  return (
    <div className="bg-grey-800 flex h-32 w-full items-center gap-8 rounded px-10">
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="text-body truncate text-base font-bold">{productTokens}</div>
        <div className="text-body-secondary flex max-w-full items-center gap-[0.3em] overflow-hidden">
          <NetworkLogo networkId={networkId} className="size-8 shrink-0" />
          <NetworkName networkId={networkId} className="truncate text-sm" />
        </div>
      </div>
      <PositionContextMenuButton position={position} />
    </div>
  )
}

const PositionContextMenuButton: FC<{ position: YieldxyzPositionEnhanced }> = ({ position }) => {
  const { t } = useTranslation()
  const {
    claimableBalances,
    withdrawableBalances,
    canEnter,
    canExit,
    onAddToPositionClick,
    onExitClick,
    onClaimClick,
    onWithdrawClick,
  } = usePositionActions(position)

  return (
    <ContextMenu placement="bottom-end">
      <ContextMenuTrigger asChild>
        <IconButton>
          <MoreHorizontalIcon />
        </IconButton>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={!canEnter} onClick={onAddToPositionClick}>
          {t("Add to position")}
        </ContextMenuItem>
        <ContextMenuItem disabled={!canExit} onClick={onExitClick}>
          {t("Exit position")}
        </ContextMenuItem>
        {claimableBalances.map((balance, index) => (
          <ContextMenuItem key={index} onClick={onClaimClick(balance)}>
            <div className="flex items-center justify-between gap-4">
              <div>{t("Claim")}</div>
              <Tokens amount={balance.amount} noCountUp symbol={balance.token.symbol} />
            </div>
          </ContextMenuItem>
        ))}
        {withdrawableBalances.map((balance, index) => (
          <ContextMenuItem key={index} onClick={onWithdrawClick(balance)}>
            <div className="flex items-center justify-between gap-4">
              <div>{t("Withdraw")}</div>
              <Tokens amount={balance.amount} noCountUp symbol={balance.token.symbol} />
            </div>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

const PositionActions: FC<{ position: YieldxyzPositionEnhanced }> = ({ position }) => {
  const { t } = useTranslation()
  const {
    canEnter,
    onAddToPositionClick,
    claimableBalances,
    onClaimClick,
    withdrawableBalances,
    onWithdrawClick,
  } = usePositionActions(position)

  const isGridLayout = useMemo(
    () => IS_POPUP && (withdrawableBalances.length || claimableBalances.length),
    [claimableBalances.length, withdrawableBalances.length],
  )

  return (
    <div
      className={cn(
        "flex w-full justify-end gap-8 overflow-hidden",
        isGridLayout && "grid grid-cols-2 gap-8",
      )}
    >
      <Button
        className={cn(!isGridLayout && "w-[17.5rem]")}
        disabled={!canEnter}
        onClick={onAddToPositionClick}
      >
        {t("Add to Position")}
      </Button>
      {withdrawableBalances.length > 0 && (
        <Button
          primary
          className={cn(!isGridLayout && "w-[17.5rem]")}
          onClick={onWithdrawClick(withdrawableBalances[0])}
        >
          {t("Withdraw")}
        </Button>
      )}
      {claimableBalances.length > 0 && (
        <Button
          primary
          className={cn(!isGridLayout && "w-[17.5rem]")}
          onClick={onClaimClick(claimableBalances[0])}
        >
          <div className="flex h-full flex-col gap-1">
            <div className="text-md font-normal">{t("Claim")}</div>
            <div className="text-tiny font-light">
              <Tokens
                amount={claimableBalances[0].amount}
                noCountUp
                symbol={claimableBalances[0].token.symbol}
              />
            </div>
          </div>
        </Button>
      )}
    </div>
  )
}

const usePositionActions = (position: YieldxyzPositionEnhanced) => {
  const { open: openEnter } = useYieldxyzEnterModal()
  const { open: openExit } = useYieldxyzExitModal()
  const { open: openManage } = useYieldxyzManageModal()

  const [claimableBalances, withdrawableBalances, canEnter, canExit] = useMemo(() => {
    return [
      position.balances.filter((b) => b.type === "claimable" && b.pendingActions.length),
      position.balances.filter((b) => b.type === "withdrawable" && b.pendingActions.length),
      position.product.status.enter,
      position.product.status.exit && position.balances.some((b) => b.type === "active"),
    ]
  }, [position])

  const onAddToPositionClick = useCallback(() => {
    openEnter({
      address: position.address,
      productId: position.product.id,
    })
  }, [openEnter, position])

  const onExitClick = useCallback(() => {
    openExit(position)
  }, [openExit, position])

  const onClaimClick = useCallback(
    (balance: BalanceDto) => () => {
      const pendingAction = balance?.pendingActions[0]
      if (!balance || !pendingAction) return
      openManage({
        position,
        pendingAction,
        balance,
      })
    },
    [openManage, position],
  )

  const onWithdrawClick = useCallback(
    (balance: BalanceDto) => () => {
      const pendingAction = balance?.pendingActions[0]
      if (!balance || !pendingAction) return
      openManage({
        position,
        pendingAction,
        balance,
      })
    },
    [openManage, position],
  )

  return {
    claimableBalances,
    withdrawableBalances,
    canEnter,
    canExit,
    onAddToPositionClick,
    onExitClick,
    onClaimClick,
    onWithdrawClick,
  }
}
