import { MoreHorizontalIcon } from "@talismn/icons"
import { formatDecimals } from "@talismn/util"
import { BalanceDto, YieldPosition } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "talisman-ui"
import urlJoin from "url-join"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { PortfolioAccount } from "@ui/domains/Portfolio/AssetDetails/PortfolioAccount"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useNetworkById, useTokens } from "@ui/state"

import { ClaimModal } from "../ClaimModal"
import { ConfirmClaimModal } from "../ConfirmClaimModal"
import { useEarnModal } from "../hooks/useEarnModal"
import { useYieldPosition } from "../hooks/useYieldPosition"
import { mapYieldNetworkToNetworkId } from "../utils/networkMapping"
import { mapYieldInputTokenToTokenId } from "../utils/tokenMapping"

export const DashboardYieldPosition: FC<{ yieldId: string | undefined }> = ({ yieldId }) => {
  const position = useYieldPosition(yieldId)
  const { open } = useEarnModal()
  const tokens = useTokens()

  // Claim modal state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [isConfirmClaimModalOpen, setIsConfirmClaimModalOpen] = useState(false)
  const [claimBalance, setClaimBalance] = useState<BalanceDto | null>(null)

  // Categorize balances on-the-fly
  const suppliedBalances = useMemo(
    () => position?.balances.filter((b) => b.type !== "claimable") || [],
    [position],
  )

  const rewardBalances = useMemo(
    () => position?.balances.filter((b) => b.type === "claimable") || [],
    [position],
  )

  // Handle Add to Position click
  const handleAddToPosition = useCallback(() => {
    if (!position?.product) return

    // Get tokenId from the position's product
    const tokenId = mapYieldInputTokenToTokenId(position.product, tokens)
    if (!tokenId) return

    // Open earn modal with pre-selected parameters
    open({
      tokenId,
      productId: position.yieldId,
      validatorAddress: position.validatorAddress,
    })
  }, [position, tokens, open])

  // Handle claim click
  const handleClaimClick = useCallback(() => {
    const balanceWithClaim = position?.balances.find((b) =>
      b.pendingActions?.some((a) => a.type === "CLAIM_REWARDS"),
    )
    setClaimBalance(balanceWithClaim || null)
    setIsClaimModalOpen(true)
  }, [position?.balances])

  // Handle claim modal next
  const handleClaimNext = useCallback(() => {
    setIsClaimModalOpen(false)
    setIsConfirmClaimModalOpen(true)
  }, [])

  // Handle claim modal close
  const handleClaimClose = useCallback(() => {
    setIsClaimModalOpen(false)
    setClaimBalance(null)
  }, [])

  // Handle confirm claim modal close
  const handleConfirmClaimClose = useCallback(() => {
    setIsConfirmClaimModalOpen(false)
    setClaimBalance(null)
  }, [])

  if (!position) return null

  return (
    <div className="flex w-full max-w-full flex-col gap-4 overflow-hidden">
      <YieldPositionHeader
        position={position}
        onAddToPosition={handleAddToPosition}
        onClaimClick={handleClaimClick}
      />
      <YieldPositionSection balances={suppliedBalances} title="Supplied" />
      <YieldPositionSection balances={rewardBalances} title="Rewards" />
      <div className="flex w-full justify-end">
        <YieldPositionActionButtons
          position={position}
          onAddToPosition={handleAddToPosition}
          onClaimClick={handleClaimClick}
        />
      </div>

      {/* Claim Modals */}
      {isClaimModalOpen && claimBalance && (
        <ClaimModal
          isOpen={isClaimModalOpen}
          onClose={handleClaimClose}
          onNext={handleClaimNext}
          yieldId={position.yieldId}
          account={claimBalance.address}
          balance={claimBalance}
          validatorAddress={position.validatorAddress}
        />
      )}

      {isConfirmClaimModalOpen && claimBalance && (
        <ConfirmClaimModal
          isOpen={isConfirmClaimModalOpen}
          onClose={handleConfirmClaimClose}
          yieldId={position.yieldId}
          account={claimBalance.address}
          balance={claimBalance}
          validatorAddress={position.validatorAddress}
        />
      )}
    </div>
  )
}

const YieldPositionHeader: FC<{
  position: YieldPosition
  onAddToPosition: () => void
  onClaimClick: () => void
}> = ({ position, onAddToPosition, onClaimClick }) => {
  const { genericEvent } = useAnalytics()
  const networkId = mapYieldNetworkToNetworkId(position.product?.network) || position.networkId
  const network = useNetworkById(networkId)

  const hasClaimableRewards = useMemo(() => {
    return position.balances.some((balance) =>
      balance.pendingActions?.some(
        (action: unknown) =>
          typeof action === "object" &&
          action !== null &&
          "type" in action &&
          (action as { type: string }).type === "CLAIM_REWARDS",
      ),
    )
  }, [position.balances])

  const claimableTokenAmount = useMemo(() => {
    return position.balances
      .filter((b) => b.type === "claimable")
      .reduce((total, balance) => total + parseFloat(balance.amount), 0)
  }, [position.balances])

  const tokenList = useMemo(() => {
    const tokens = []
    if (position.product?.inputTokens?.[0]) {
      tokens.push(position.product.inputTokens[0].symbol)
    }
    if (position.product?.outputToken) {
      tokens.push(position.product.outputToken.symbol)
    }
    return tokens.join(" / ")
  }, [position.product])

  // Get first balance for address info
  const firstBalance = position.balances[0]

  // Use product metadata for primary token info (more reliable than balances[0])
  const primaryToken = position.product?.inputTokens?.[0] || firstBalance?.token

  // Generate URLs for external links
  const blockExplorerUrl = useMemo(() => {
    if (!network?.blockExplorerUrls.length || !firstBalance?.address) return null
    return urlJoin(network.blockExplorerUrls[0], "address", firstBalance.address)
  }, [network, firstBalance?.address])

  const coingeckoUrl = useMemo(() => {
    // Use coinGeckoId from the primary token in the position
    if (!primaryToken?.coinGeckoId) return null
    return urlJoin("https://coingecko.com/en/coins/", primaryToken.coinGeckoId)
  }, [primaryToken?.coinGeckoId])

  // Event handlers
  const handleViewOnExplorerClick = useCallback(() => {
    if (!blockExplorerUrl) return
    window.open(blockExplorerUrl, "_blank")
    genericEvent("open view on explorer", { from: "yield position menu" })
  }, [blockExplorerUrl, genericEvent])

  const handleViewOnCoingeckoClick = useCallback(() => {
    if (!coingeckoUrl) return
    window.open(coingeckoUrl, "_blank")
    genericEvent("open view on coingecko", { from: "yield position menu" })
  }, [coingeckoUrl, genericEvent])

  return (
    <div className="bg-black-secondary rounded-sm">
      <div className="flex w-full max-w-full items-center justify-between overflow-hidden p-8">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="truncate text-base font-bold text-white">{tokenList}</div>
          <div className="flex items-center gap-2">
            <NetworkLogo networkId={networkId} className="text-base" />
            <span className="text-body-secondary truncate text-sm">
              <NetworkName networkId={networkId} />
            </span>
          </div>
        </div>
        <ContextMenu placement="bottom-end">
          <ContextMenuTrigger className="hover:bg-grey-800 text-body-secondary hover:text-body shrink-0 rounded p-2">
            <MoreHorizontalIcon className="h-6 w-6" />
          </ContextMenuTrigger>
          <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
            <ContextMenuItem onClick={onAddToPosition}>Add to position</ContextMenuItem>
            {hasClaimableRewards && (
              <ContextMenuItem onClick={onClaimClick}>
                Claim {claimableTokenAmount.toFixed(4)} {primaryToken?.symbol}
              </ContextMenuItem>
            )}
            <ContextMenuItem
              onClick={() => {
                // TODO: Implement withdraw
              }}
            >
              Withdraw
            </ContextMenuItem>
            {coingeckoUrl && (
              <ContextMenuItem onClick={handleViewOnCoingeckoClick}>
                View on CoinGecko
              </ContextMenuItem>
            )}
            {blockExplorerUrl && (
              <ContextMenuItem onClick={handleViewOnExplorerClick}>
                View on Explorer
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  )
}

const YieldPositionActionButtons: FC<{
  position: YieldPosition
  onAddToPosition: () => void
  onClaimClick: () => void
}> = ({ position, onAddToPosition, onClaimClick }) => {
  // Check if there are claimable rewards with CLAIM_REWARDS action
  const hasClaimableRewards = useMemo(() => {
    return position.balances.some((balance) =>
      balance.pendingActions?.some(
        (action: unknown) =>
          typeof action === "object" &&
          action !== null &&
          "type" in action &&
          (action as { type: string }).type === "CLAIM_REWARDS",
      ),
    )
  }, [position.balances])

  const claimableTokenAmount = useMemo(() => {
    return position.balances
      .filter((b) => b.type === "claimable")
      .reduce((total, balance) => total + parseFloat(balance.amount), 0)
  }, [position.balances])

  const primaryToken = position.balances[0]?.token

  return (
    <div className="flex w-full max-w-full gap-4 overflow-hidden">
      <button
        type="button"
        className="hover:bg-grey-800/20 flex min-w-80 max-w-full flex-col items-center justify-center gap-2 rounded border-2 border-transparent border-white p-6"
        onClick={onAddToPosition}
      >
        <span className="truncate">Add to Position</span>
      </button>
      {hasClaimableRewards && (
        <button
          type="button"
          className="flex min-w-80 max-w-full flex-col items-center justify-center gap-1 rounded border-transparent bg-[#D5FF5C] p-6 text-black hover:bg-[#D5FF5C]/80"
          onClick={onClaimClick}
        >
          <div className="truncate font-medium text-black">Claim</div>
          <div className="text-grey-800 truncate text-sm font-light">
            {claimableTokenAmount.toFixed(4)} {primaryToken?.symbol}
          </div>
        </button>
      )}
    </div>
  )
}

const YieldPositionSection: FC<{
  balances: BalanceDto[]
  title: string
}> = ({ balances, title }) => {
  if (!balances.length) return null

  return (
    <div className="bg-black-secondary rounded-sm">
      <div className="flex h-24 w-full max-w-full items-center overflow-hidden">
        <div className="truncate px-8 text-base font-bold text-white">{title}</div>
      </div>
      {balances.map((balance, idx) => (
        <YieldPositionItemRow key={idx} balance={balance} />
      ))}
    </div>
  )
}

const YieldPositionItemRow: FC<{
  balance: BalanceDto
}> = ({ balance }) => {
  return (
    <div className="flex h-[6.6rem] w-full items-center gap-8 overflow-hidden px-8">
      <AssetLogo url={balance.token.logoURI} className="size-16" />
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center justify-between gap-8 overflow-hidden font-bold">
          <div className="grow truncate">{balance.token.symbol}</div>
          <div className="max-w-[50%] truncate">
            {formatDecimals(balance.amount)} {balance.token.symbol}
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-8 overflow-hidden font-normal">
          <div className="grow truncate">
            <PortfolioAccount address={balance.address} />
          </div>
          <div className="shrink-0">
            <FiatFromUsd amount={parseFloat(balance.amountUsd || "0")} isBalance />
          </div>
        </div>
      </div>
    </div>
  )
}
