import { EvmErc20Token } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { MoreHorizontalIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import React, { FC, forwardRef, Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  PopoverOptions,
} from "talisman-ui"
import urlJoin from "url-join"

import { useInlineStakingModal } from "@ui/domains/Staking/useInlineStakingModal"
import { useNomPoolStakingElligibility } from "@ui/domains/Staking/useNomPoolStakingElligibility"
import { useViewOnExplorer } from "@ui/domains/ViewOnExplorer"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"

const ViewOnExplorerMenuItem: FC<{ token: EvmErc20Token }> = ({ token }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { open, canOpen } = useViewOnExplorer(token.contractAddress, token.evmNetwork?.id)

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

const StakeMenuItem: FC<{ tokenId: string }> = ({ tokenId }) => {
  const { t } = useTranslation()
  const { open } = useInlineStakingModal()
  const { data: addressAndPool } = useNomPoolStakingElligibility(tokenId)

  const { genericEvent } = useAnalytics()

  const handleClick = useCallback(() => {
    if (!addressAndPool) return
    const { address, poolId } = addressAndPool
    open({ tokenId, address, poolId })
    genericEvent("open inline staking modal", { from: "token menu", tokenId })
  }, [addressAndPool, genericEvent, open, tokenId])

  if (!addressAndPool) return null

  return <ContextMenuItem onClick={handleClick}>{t("Stake")}</ContextMenuItem>
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

  const showMenu = useMemo(() => {
    // need at least 1 entry to be displayable, otherwise don't show the menu at all
    if (token?.coingeckoId) return true
    if (token?.type === "evm-erc20") return true
    return false
  }, [token])

  if (!showMenu) return null

  return (
    <ContextMenu placement={placement ?? "bottom-end"}>
      <ContextMenuTrigger
        ref={ref}
        className={classNames(
          "hover:bg-grey-800 text-body-secondary hover:text-body rounded p-6",
          className
        )}
        asChild={!!trigger}
      >
        {trigger ? trigger : <MoreHorizontalIcon className="shrink-0" />}
      </ContextMenuTrigger>
      <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
        {token?.type === "evm-erc20" && (
          <Suspense>
            <ViewOnExplorerMenuItem token={token} />
          </Suspense>
        )}
        {!!token?.coingeckoId && <ViewOnCoingeckoMenuItem coingeckoId={token.coingeckoId} />}
        <Suspense>
          <StakeMenuItem tokenId={tokenId} />
        </Suspense>
      </ContextMenuContent>
    </ContextMenu>
  )
})
