import type { EvmErc20Token, Token, TokenId } from "@talismn/chaindata-provider"
import { MoreHorizontalIcon } from "@talismn/icons"
import { api } from "@ui/api"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import type { PopoverOptions } from "@ui/components/Popover"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { useBittensorChangeValidatorModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorChangeValidatorModal"
import { useBittensorStakingPositions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPositions"
import { useBondModal } from "@ui/domains/Staking/Bond/hooks/useBondModal"
import { useNomPoolStakingStatus } from "@ui/domains/Staking/hooks/nomPools/useNomPoolStakingStatus"
import { useViewOnExplorer } from "@ui/domains/ViewOnExplorer"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type React from "react"
import { type FC, forwardRef, Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import urlJoin from "url-join"

import { usePortfolioNavigation } from "../usePortfolioNavigation"

const ViewOnExplorerMenuItem: FC<{ token: EvmErc20Token }> = ({ token }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { open, canOpen } = useViewOnExplorer(token.contractAddress, token.networkId)

  const handleClick = useCallback(() => {
    open()
    genericEvent("open view on explorer", { from: "token menu" })
  }, [genericEvent, open])

  if (!canOpen) return null

  return <ContextMenuItem onClick={handleClick}>{t("View on explorer")}</ContextMenuItem>
}

const ViewOnCoingeckoMenuItem: FC<{ coingeckoId: string }> = ({ coingeckoId }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const handleClick = useCallback(() => {
    window.open(urlJoin("https://coingecko.com/en/coins/", coingeckoId), "_blank")
    genericEvent("open view on coingecko", { from: "token menu" })
  }, [coingeckoId, genericEvent])

  if (!coingeckoId) return null

  return <ContextMenuItem onClick={handleClick}>{t("View on Coingecko")}</ContextMenuItem>
}

const ViewTokenDetailsMenuItem: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const handleClick = useCallback(() => {
    api.dashboardOpen(`/settings/networks-tokens/tokens/${tokenId}`)
    genericEvent("open view token details", { from: "token menu" })
  }, [genericEvent, tokenId])

  return <ContextMenuItem onClick={handleClick}>{t("View Token Details")}</ContextMenuItem>
}

const StakeMenuItem: FC<{ tokenId: string }> = ({ tokenId }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { open } = useBondModal()
  const { data: stakingStatus } = useNomPoolStakingStatus(tokenId)

  const openArgs = useMemo<Parameters<typeof open>[0] | undefined>(() => {
    if (!stakingStatus) return
    const { accounts, poolId } = stakingStatus
    const acc = accounts?.find((s) => s.canBondNomPool)
    if (!acc) return
    return {
      tokenId,
      address: acc.address,
      poolId: acc.poolId ?? poolId,
    }
  }, [stakingStatus, tokenId])

  const handleClick = useCallback(() => {
    if (!openArgs) return
    open(openArgs)
    genericEvent("open inline staking modal", { tokenId: openArgs.tokenId })
  }, [genericEvent, open, openArgs])

  if (!openArgs) return null

  return <ContextMenuItem onClick={handleClick}>{t("Stake")}</ContextMenuItem>
}

const ChangeValidatorMenuItem: FC<{ token: Token }> = ({ token }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const { open } = useBittensorChangeValidatorModal()
  const { selectedAccount } = usePortfolioNavigation()

  const isBittensorDTao =
    token.type === "substrate-dtao" && bittensorNetworkIds.includes(token.networkId)

  const positions = useBittensorStakingPositions(isBittensorDTao ? token.networkId : null)

  const hasPosition = useMemo(
    () =>
      positions.some((p) => {
        const tokenMatch = p.token.id === token.id
        const addressMatch =
          !selectedAccount?.address || p.balance.address === selectedAccount.address
        return tokenMatch && addressMatch
      }),
    [positions, token.id, selectedAccount?.address]
  )

  const handleClick = useCallback(() => {
    open({ tokenId: token.id, address: selectedAccount?.address })
    genericEvent("open change validator modal", { tokenId: token.id })
  }, [open, token.id, genericEvent, selectedAccount?.address])

  if (!isBittensorDTao || !hasPosition) return null

  return <ContextMenuItem onClick={handleClick}>{t("Change Validator")}</ContextMenuItem>
}

type Props = {
  tokenId: TokenId
  placement?: PopoverOptions["placement"]
  trigger?: React.ReactNode
  className?: string
}

export const TokenContextMenu = forwardRef<HTMLElement, Props>(function AccountContextMenu(
  { tokenId, placement, trigger, className },
  ref
) {
  const token = useToken(tokenId)

  return (
    <ContextMenu placement={placement ?? "bottom-end"}>
      <ContextMenuTrigger
        ref={ref}
        className={cn(
          "rounded p-6 text-body-secondary hover:bg-grey-800 hover:text-body",
          className
        )}
        asChild={!!trigger}
      >
        {trigger ? trigger : <MoreHorizontalIcon className="shrink-0" />}
      </ContextMenuTrigger>
      <ContextMenuContent className="z-50 flex w-min flex-col whitespace-nowrap rounded-sm border border-grey-800 bg-black px-2 py-3 text-left text-sm shadow-lg">
        {token?.type === "evm-erc20" && (
          <Suspense fallback={<SuspenseTracker name="TokenContextMenu.Explorer" />}>
            <ViewOnExplorerMenuItem token={token} />
          </Suspense>
        )}
        {!!token?.coingeckoId && <ViewOnCoingeckoMenuItem coingeckoId={token.coingeckoId} />}
        <Suspense fallback={<SuspenseTracker name="TokenContextMenu.Stake" />}>
          <StakeMenuItem tokenId={tokenId} />
        </Suspense>
        <ViewTokenDetailsMenuItem tokenId={tokenId} />
        {token && <ChangeValidatorMenuItem token={token} />}
      </ContextMenuContent>
    </ContextMenu>
  )
})
