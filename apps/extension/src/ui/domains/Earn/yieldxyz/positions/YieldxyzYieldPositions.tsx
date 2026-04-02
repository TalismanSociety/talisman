import { YIELD_API_BASE_URL } from "@common/constants"
import { log } from "@common/log"
import type { BalanceDto, YieldDto } from "@core/domains/earn/exports"
import { isAccountOwned } from "@core/domains/keyring/exports"
import { getBlockExplorerUrls } from "@talismn/chaindata-provider"
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
import { useNetworkById } from "@ui/state/chaindata"
import type { YieldxyzPositionEnhanced } from "@ui/state/yieldxyz"
import { useYieldNetworkIdToTalismanNetworkIdMap, useYieldxyzProduct } from "@ui/state/yieldxyz"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

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
  const contractAddress = useYieldxyzContractAddress(yieldId, product)

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
      {positions?.map((position, index) => (
        <Position
          // biome-ignore lint/suspicious/noArrayIndexKey: legacy
          key={index}
          position={position}
          isLoading={status === "loading"}
          contractAddress={contractAddress}
        />
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
    [positions]
  )

  return (
    <div className="flex h-28 w-full items-center gap-8 overflow-hidden">
      <div className="flex h-full grow items-center gap-4 overflow-hidden">
        <IconButton onClick={() => navigate("/earn/positions", true)}>
          <ChevronLeftIcon />
        </IconButton>
        <YieldxyzProviderLogo providerId={product.providerId} className="size-[2.25rem]" />

        <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden">
          <div className="flex w-full items-center gap-8 overflow-hidden">
            <div className="flex grow items-center gap-2 overflow-hidden truncate text-body">
              <div className="truncate">{product.metadata.name}</div>
              {!!product.mechanics?.type && (
                <EarnTypeBadge className="shrink-0">{product.mechanics.type}</EarnTypeBadge>
              )}
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

const Position: FC<{
  position: YieldxyzPositionEnhanced
  isLoading: boolean
  contractAddress: string | null
}> = ({ position, isLoading, contractAddress }) => {
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
      { supplied: [], rewards: [] }
    )
  }, [position.balances])

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden">
      <PositionHeader position={position} contractAddress={contractAddress} />
      <PositionBalancesGroup label={t("Supplied")} balances={supplied} isLoading={isLoading} />
      <PositionBalancesGroup label={t("Rewards")} balances={rewards} isLoading={isLoading} />
      <PositionActions position={position} />
    </div>
  )
}

const PositionBalancesGroup: FC<{ label: string; balances: BalanceDto[]; isLoading: boolean }> = ({
  label,
  balances,
  isLoading,
}) => {
  if (!balances.length) return null

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded bg-grey-850 px-10">
      <div className="flex h-20 w-full items-center truncate font-bold">{label}</div>
      <div>
        {balances.map((balance, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: legacy
          <PositionBalancesGroupRow key={index} balance={balance} isLoading={isLoading} />
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
      <div className="flex grow flex-col justify-center gap-1 overflow-hidden text-sm">
        <div className="flex w-full justify-between overflow-hidden font-bold text-body">
          <div>{token ? <TokenDisplaySymbol tokenId={token.id} /> : balance.token.symbol}</div>
          <div className={cn(isLoading && "animate-pulse")}>
            <Tokens amount={balance.amount} decimals={balance.token.decimals} noCountUp />{" "}
            {balance.token.symbol}
          </div>
        </div>
        <div className="flex w-full justify-between overflow-hidden text-body-secondary text-sm">
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

const PositionHeader: FC<{
  position: YieldxyzPositionEnhanced
  contractAddress: string | null
}> = ({ position, contractAddress }) => {
  const toTalismanNetworkId = useYieldNetworkIdToTalismanNetworkIdMap()

  const networkId = useMemo(
    () => toTalismanNetworkId[position.product.network],
    [position.product.network, toTalismanNetworkId]
  )

  const productTokens = useMemo(() => {
    return position.product.token.name ?? position.product.token.symbol
  }, [position.product.token.name, position.product.token.symbol])

  return (
    <div className="flex h-32 w-full items-center gap-8 rounded bg-grey-800 px-10">
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="truncate font-bold text-base text-body">{productTokens}</div>
        <div className="flex max-w-full items-center gap-[0.3em] overflow-hidden text-body-secondary">
          <NetworkLogo networkId={networkId} className="size-8 shrink-0" />
          <NetworkName networkId={networkId} className="truncate text-sm" />
        </div>
      </div>
      <AddStakeButton position={position} />
      <PositionContextMenuButton position={position} contractAddress={contractAddress} />
    </div>
  )
}

const AddStakeButton: FC<{ position: YieldxyzPositionEnhanced }> = ({ position }) => {
  const { t } = useTranslation()
  const { canEnter, onAddToPositionClick } = usePositionActions(position)

  if (!canEnter) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onAddToPositionClick}
          className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[1.25rem] text-primary hover:bg-primary/20"
        >
          <ZapPlusIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Add to Position")}</TooltipContent>
    </Tooltip>
  )
}

const PositionContextMenuButton: FC<{
  position: YieldxyzPositionEnhanced
  contractAddress: string | null
}> = ({ position, contractAddress }) => {
  const { t } = useTranslation()
  const network = useNetworkById(position.networkId)
  const {
    claimableBalances,
    withdrawableBalances,
    canEnter,
    canExit,
    canManage,
    onAddToPositionClick,
    onExitClick,
    onClaimClick,
    onWithdrawClick,
  } = usePositionActions(position)

  const blockExplorerUrl = useMemo(() => {
    if (!contractAddress || !network?.blockExplorerUrls.length) return null
    return getBlockExplorerUrls(network, { type: "address", address: contractAddress })[0] ?? null
  }, [network, contractAddress])

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
          // biome-ignore lint/suspicious/noArrayIndexKey: legacy
          <ContextMenuItem key={index} disabled={!canManage} onClick={onClaimClick(balance)}>
            <div className="flex items-center justify-between gap-4">
              <div>{t("Claim")}</div>
              <Tokens amount={balance.amount} noCountUp symbol={balance.token.symbol} />
            </div>
          </ContextMenuItem>
        ))}
        {withdrawableBalances.map((balance, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: legacy
          <ContextMenuItem key={index} disabled={!canManage} onClick={onWithdrawClick(balance)}>
            <div className="flex items-center justify-between gap-4">
              <div>{t("Withdraw")}</div>
              <Tokens amount={balance.amount} noCountUp symbol={balance.token.symbol} />
            </div>
          </ContextMenuItem>
        ))}
        {!!blockExplorerUrl && (
          <ContextMenuItem onClick={() => window.open(blockExplorerUrl, "_blank")}>
            {t("View on Block Explorer")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

const PositionActions: FC<{ position: YieldxyzPositionEnhanced }> = ({ position }) => {
  const { t } = useTranslation()
  const { canManage, claimableBalances, onClaimClick, withdrawableBalances, onWithdrawClick } =
    usePositionActions(position)

  const isGridLayout = useMemo(
    () => IS_POPUP && withdrawableBalances.length > 0 && claimableBalances.length > 0,
    [claimableBalances.length, withdrawableBalances.length]
  )

  if (!withdrawableBalances.length && !claimableBalances.length) return null

  return (
    <div
      className={cn(
        "flex w-full justify-end gap-8 overflow-hidden",
        isGridLayout && "grid grid-cols-2 gap-8"
      )}
    >
      {withdrawableBalances.length > 0 && (
        <Button
          primary
          disabled={!canManage}
          className={cn(!isGridLayout && "w-43.75 text-base")}
          onClick={onWithdrawClick(withdrawableBalances[0])}
        >
          {t("Withdraw")}
        </Button>
      )}
      {claimableBalances.length > 0 && (
        <Button
          primary
          disabled={!canManage}
          className={cn(!isGridLayout && "w-43.75 text-base")}
          onClick={onClaimClick(claimableBalances[0])}
        >
          <div className="flex h-full flex-col gap-1">
            <div className="font-normal text-md">{t("Claim")}</div>
            <div className="font-light text-tiny">
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
  const account = useAccountByAddress(position.address)
  const { open: openEnter } = useYieldxyzEnterModal()
  const { open: openExit } = useYieldxyzExitModal()
  const { open: openManage } = useYieldxyzManageModal()

  const [claimableBalances, withdrawableBalances, canEnter, canExit, canManage] = useMemo(() => {
    const isOwned = isAccountOwned(account)
    return [
      position.balances.filter((b) => b.type === "claimable" && b.pendingActions.length),
      position.balances.filter((b) => b.type === "withdrawable" && b.pendingActions.length),
      isOwned && position.product.status.enter,
      isOwned && position.product.status.exit && position.balances.some((b) => b.type === "active"),
      isOwned,
    ]
  }, [account, position])

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
    [openManage, position]
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
    [openManage, position]
  )

  return {
    claimableBalances,
    withdrawableBalances,
    canEnter,
    canExit,
    canManage,
    onAddToPositionClick,
    onExitClick,
    onClaimClick,
    onWithdrawClick,
  }
}

type YieldWithState = YieldDto & {
  state?: {
    pricePerShareState?: {
      shareToken?: { address?: string }
    }
  }
}

const getContractAddress = (yield_: YieldWithState | null | undefined): string | null =>
  yield_?.state?.pricePerShareState?.shareToken?.address ?? null

const useYieldxyzContractAddress = (
  yieldId: string,
  product: YieldDto | null | undefined
): string | null => {
  const [contractAddress, setContractAddress] = useState<string | null>(() =>
    getContractAddress(product as YieldWithState)
  )

  useEffect(() => {
    const fromProduct = getContractAddress(product as YieldWithState)
    if (fromProduct) return setContractAddress(fromProduct)

    const controller = new AbortController()
    const fetchYield = async () => {
      try {
        const res = await fetch(`${YIELD_API_BASE_URL}/v1/yields/${encodeURIComponent(yieldId)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Failed to fetch yield: ${res.status}`)
        const result = (await res.json()) as YieldWithState
        setContractAddress(getContractAddress(result))
      } catch (err) {
        if (!controller.signal.aborted) log.error("[earn] Failed to fetch yield detail", err)
      }
    }
    fetchYield()

    return () => controller.abort()
  }, [yieldId, product])

  return contractAddress
}
