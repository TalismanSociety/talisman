// import { MoreHorizontalIcon } from "@talismn/icons"
// import { formatDecimals } from "@talismn/util"
// import { BalanceDto, YieldxyzPosition } from "extension-core"
// import { log } from "extension-shared"
// import { FC, useCallback, useEffect, useMemo, useState } from "react"
// import { useTranslation } from "react-i18next"
// import {
//   Button,
//   ContextMenu,
//   ContextMenuContent,
//   ContextMenuItem,
//   ContextMenuTrigger,
// } from "talisman-ui"
// import urlJoin from "url-join"

// import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
// import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
// import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
// import { NetworkName } from "@ui/domains/Networks/NetworkName"
// import { useAnalytics } from "@ui/hooks/useAnalytics"
// import { useNetworkById, useTokens } from "@ui/state"
// import { useYieldxyzProduct } from "@ui/state/yieldxyz"

// import { ClaimModal } from "../ClaimModal"
// import { ConfirmClaimModal } from "../ConfirmClaimModal"
// import { ConfirmWithdrawModal } from "../ConfirmWithdrawModal"
// import { useEarnModal } from "../hooks/useEarnModal"
// import { useYieldxyzPosition } from "../hooks/useYieldxyzPosition"
// import { mapYieldInputTokenToTokenId } from "../utils/tokenMapping"
// import { WithdrawModal } from "../WithdrawModal"

// export const DashboardYieldPosition: FC<{
//   yieldId: string | undefined
//   accountAddress?: string | null
//   validatorAddress?: string | null
// }> = ({ yieldId, accountAddress, validatorAddress }) => {
//   const position = useYieldxyzPosition(yieldId, accountAddress, validatorAddress)
//   const { open } = useEarnModal()
//   const tokens = useTokens()

//   // Claim modal state
//   const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
//   const [isConfirmClaimModalOpen, setIsConfirmClaimModalOpen] = useState(false)
//   const [claimBalance, setClaimBalance] = useState<BalanceDto | null>(null)

//   // Withdraw modal state
//   const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
//   const [isConfirmWithdrawModalOpen, setIsConfirmWithdrawModalOpen] = useState(false)
//   const [withdrawBalance, setWithdrawBalance] = useState<BalanceDto | null>(null)

//   // Categorize balances on-the-fly
//   const suppliedBalances = useMemo(
//     () =>
//       position?.balances.filter(
//         (b) =>
//           (["exiting", "entering"].includes(b.type) || !["claimable", "reward"].includes(b.type)) &&
//           !b.pendingActions?.some((a) => a.type === "CLAIM_REWARDS"),
//       ) || [],
//     [position],
//   )

//   const rewardBalances = useMemo(
//     () =>
//       position?.balances.filter((b) => {
//         // Check if balance type is claimable or reward
//         const isRewardType = ["claimable", "reward"].includes(b.type)

//         // Check if balance has pendingActions with CLAIM_REWARDS
//         const hasClaimAction = b.pendingActions?.some((a) => a.type === "CLAIM_REWARDS")

//         return isRewardType || !!hasClaimAction
//       }) || [],
//     [position],
//   )

//   // Handle Add to Position click
//   const handleAddToPosition = useCallback(() => {
//     if (!position?.product) return

//     // Get tokenId from the position's product
//     const tokenId = mapYieldInputTokenToTokenId(position.product, tokens)
//     if (!tokenId) return

//     // Open earn modal with pre-selected parameters
//     open({
//       tokenId,
//       productId: position.yieldId,
//       validatorAddress: position.validatorAddress,
//     })
//   }, [position, tokens, open])

//   // Handle claim click
//   const handleClaimClick = useCallback(() => {
//     const balanceWithClaim = position?.balances.find((b) =>
//       b.pendingActions?.some((a) => a.type === "CLAIM_REWARDS"),
//     )
//     setClaimBalance(balanceWithClaim || null)
//     setIsClaimModalOpen(true)
//   }, [position?.balances])

//   // Handle claim modal next
//   const handleClaimNext = useCallback(() => {
//     setIsClaimModalOpen(false)
//     setIsConfirmClaimModalOpen(true)
//   }, [])

//   // Handle claim modal close
//   const handleClaimClose = useCallback(() => {
//     setIsClaimModalOpen(false)
//     setClaimBalance(null)
//   }, [])

//   // Handle confirm claim modal close
//   const handleConfirmClaimClose = useCallback(() => {
//     setIsConfirmClaimModalOpen(false)
//     setClaimBalance(null)
//   }, [])

//   // Handle withdraw modal next
//   const handleWithdrawNext = useCallback(() => {
//     setIsWithdrawModalOpen(false)
//     setIsConfirmWithdrawModalOpen(true)
//   }, [])

//   // Handle withdraw modal close
//   const handleWithdrawClose = useCallback(() => {
//     setIsWithdrawModalOpen(false)
//     setWithdrawBalance(null)
//   }, [])

//   // Handle confirm withdraw modal close
//   const handleConfirmWithdrawClose = useCallback(() => {
//     setIsConfirmWithdrawModalOpen(false)
//     setWithdrawBalance(null)
//   }, [])

//   // Handle withdraw click
//   const _handleWithdrawClick = useCallback((balance: BalanceDto) => {
//     setWithdrawBalance(balance)
//     setIsWithdrawModalOpen(true)
//   }, [])

//   // Handle withdraw from dropdown menu
//   const handleWithdrawClick = useCallback(() => {
//     const firstSuppliedBalance = suppliedBalances[0]
//     if (firstSuppliedBalance) {
//       _handleWithdrawClick(firstSuppliedBalance)
//     }
//   }, [suppliedBalances, _handleWithdrawClick])

//   useEffect(() => {
//     log.debug("DashboardYieldPosition render", { position })
//   }, [position])

//   if (!position) return null

//   return (
//     <div className="flex w-full max-w-full flex-col gap-4 overflow-hidden">
//       <YieldPositionHeader
//         position={position}
//         onAddToPosition={handleAddToPosition}
//         onClaimClick={handleClaimClick}
//         onWithdrawClick={handleWithdrawClick}
//         hasSuppliedBalances={suppliedBalances.length > 0}
//       />
//       <YieldPositionSection
//         balances={suppliedBalances}
//         title="Supplied"
//         onWithdraw={_handleWithdrawClick}
//       />
//       <YieldPositionSection
//         balances={rewardBalances}
//         title="Rewards"
//         // No onWithdraw prop - rewards section won't show withdraw button
//       />
//       <div className="flex w-full justify-end">
//         <YieldPositionActionButtons
//           position={position}
//           onAddToPosition={handleAddToPosition}
//           onClaimClick={handleClaimClick}
//         />
//       </div>

//       {/* Claim Modals */}
//       {isClaimModalOpen && claimBalance && (
//         <ClaimModal
//           isOpen={isClaimModalOpen}
//           onClose={handleClaimClose}
//           onNext={handleClaimNext}
//           yieldId={position.yieldId}
//           account={claimBalance.address}
//           balance={claimBalance}
//           validatorAddress={position.validatorAddress}
//         />
//       )}

//       {isConfirmClaimModalOpen && claimBalance && (
//         <ConfirmClaimModal
//           isOpen={isConfirmClaimModalOpen}
//           onClose={handleConfirmClaimClose}
//           yieldId={position.yieldId}
//           account={claimBalance.address}
//           balance={claimBalance}
//           validatorAddress={position.validatorAddress}
//         />
//       )}

//       {/* Withdraw Modals */}
//       {isWithdrawModalOpen && withdrawBalance && (
//         <WithdrawModal
//           isOpen={isWithdrawModalOpen}
//           onClose={handleWithdrawClose}
//           onNext={handleWithdrawNext}
//           yieldId={position.yieldId}
//           account={withdrawBalance.address}
//           balance={withdrawBalance}
//           validatorAddress={
//             (withdrawBalance as BalanceDto & { validator?: { address?: string } }).validator
//               ?.address || undefined
//           }
//         />
//       )}

//       {isConfirmWithdrawModalOpen && withdrawBalance && (
//         <ConfirmWithdrawModal
//           isOpen={isConfirmWithdrawModalOpen}
//           onClose={handleConfirmWithdrawClose}
//           yieldId={position.yieldId}
//           account={withdrawBalance.address}
//           balance={withdrawBalance}
//           validatorAddress={
//             (withdrawBalance as BalanceDto & { validator?: { address?: string } }).validator
//               ?.address || undefined
//           }
//         />
//       )}
//     </div>
//   )
// }

// const YieldPositionHeader: FC<{
//   position: YieldxyzPosition
//   onAddToPosition: () => void
//   onClaimClick: () => void
//   onWithdrawClick?: () => void
//   hasSuppliedBalances?: boolean
// }> = ({ position, onAddToPosition, onClaimClick, onWithdrawClick, hasSuppliedBalances }) => {
//   const { genericEvent } = useAnalytics()

//   // const networkId = useTalismanNetworkIdFromYieldNetworkId(position.product?.network) //  mapYieldNetworkToNetworkId(position.product?.network) || position.networkId
//   const network = useNetworkById(position.networkId)
//   const { data: product } = useYieldxyzProduct(position.yieldId)

//   const hasClaimableRewards = useMemo(() => {
//     return position.balances.some((balance) =>
//       balance.pendingActions?.some(
//         (action: unknown) =>
//           typeof action === "object" &&
//           action !== null &&
//           "type" in action &&
//           (action as { type: string }).type === "CLAIM_REWARDS",
//       ),
//     )
//   }, [position.balances])

//   const claimableTokenAmount = useMemo(() => {
//     return position.balances
//       .filter((b) => b.type === "claimable")
//       .reduce((total, balance) => total + parseFloat(balance.amount), 0)
//   }, [position.balances])

//   const tokenList = useMemo(() => {
//     const tokens = []
//     if (product?.inputTokens?.[0]) {
//       tokens.push(product.inputTokens[0].symbol)
//     }
//     if (product?.outputToken) {
//       tokens.push(product.outputToken.symbol)
//     }
//     return tokens.join(" / ")
//   }, [product])

//   // Get first balance for address info
//   const firstBalance = position.balances[0]

//   // Use product metadata for primary token info (more reliable than balances[0])
//   const primaryToken = product?.inputTokens?.[0] || firstBalance?.token

//   // Generate URLs for external links
//   const blockExplorerUrl = useMemo(() => {
//     if (!network?.blockExplorerUrls.length || !firstBalance?.address) return null
//     return urlJoin(network.blockExplorerUrls[0], "address", firstBalance.address)
//   }, [network, firstBalance?.address])

//   const coingeckoUrl = useMemo(() => {
//     // Use coinGeckoId from the primary token in the position
//     if (!primaryToken?.coinGeckoId) return null
//     return urlJoin("https://coingecko.com/en/coins/", primaryToken.coinGeckoId)
//   }, [primaryToken?.coinGeckoId])

//   // Event handlers
//   const handleViewOnExplorerClick = useCallback(() => {
//     if (!blockExplorerUrl) return
//     window.open(blockExplorerUrl, "_blank")
//     genericEvent("open view on explorer", { from: "yield position menu" })
//   }, [blockExplorerUrl, genericEvent])

//   const handleViewOnCoingeckoClick = useCallback(() => {
//     if (!coingeckoUrl) return
//     window.open(coingeckoUrl, "_blank")
//     genericEvent("open view on coingecko", { from: "yield position menu" })
//   }, [coingeckoUrl, genericEvent])

//   return (
//     <div className="bg-black-secondary rounded-sm">
//       <div className="flex w-full max-w-full items-center justify-between overflow-hidden p-8">
//         <div className="flex min-w-0 flex-col gap-2">
//           <div className="truncate text-base font-bold text-white">{tokenList}</div>
//           <div className="flex items-center gap-2">
//             <NetworkLogo networkId={position.networkId} className="text-base" />
//             <span className="text-body-secondary truncate text-sm">
//               <NetworkName networkId={position.networkId} />
//             </span>
//           </div>
//         </div>
//         <ContextMenu placement="bottom-end">
//           <ContextMenuTrigger className="hover:bg-grey-800 text-body-secondary hover:text-body shrink-0 rounded p-2">
//             <MoreHorizontalIcon className="h-6 w-6" />
//           </ContextMenuTrigger>
//           <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
//             <ContextMenuItem onClick={onAddToPosition}>Add to position</ContextMenuItem>
//             {hasSuppliedBalances && onWithdrawClick && (
//               <ContextMenuItem onClick={onWithdrawClick}>Withdraw</ContextMenuItem>
//             )}
//             {hasClaimableRewards && (
//               <ContextMenuItem onClick={onClaimClick}>
//                 <div className="flex w-full items-center justify-between">
//                   <span>Claim</span>
//                   <span className="text-body-secondary flex items-center gap-2 text-[10px]">
//                     {claimableTokenAmount.toFixed(4)} {primaryToken?.symbol}
//                     <span className="border-grey-800 inline-block h-4 w-4 rounded-full border-2 bg-[#D5FF5C]" />
//                   </span>
//                 </div>
//               </ContextMenuItem>
//             )}
//             {coingeckoUrl && (
//               <ContextMenuItem onClick={handleViewOnCoingeckoClick}>
//                 View on CoinGecko
//               </ContextMenuItem>
//             )}
//             {blockExplorerUrl && (
//               <ContextMenuItem onClick={handleViewOnExplorerClick}>
//                 View on Explorer
//               </ContextMenuItem>
//             )}
//           </ContextMenuContent>
//         </ContextMenu>
//       </div>
//     </div>
//   )
// }

// const YieldPositionActionButtons: FC<{
//   position: YieldxyzPosition
//   onAddToPosition: () => void
//   onClaimClick: () => void
// }> = ({ position, onAddToPosition, onClaimClick }) => {
//   const { t } = useTranslation()
//   // Check if there are claimable rewards with CLAIM_REWARDS action
//   const hasClaimableRewards = useMemo(() => {
//     return position.balances.some((balance) =>
//       balance.pendingActions?.some(
//         (action: unknown) =>
//           typeof action === "object" &&
//           action !== null &&
//           "type" in action &&
//           (action as { type: string }).type === "CLAIM_REWARDS",
//       ),
//     )
//   }, [position.balances])

//   const claimableTokenAmount = useMemo(() => {
//     return position.balances
//       .filter((b) => b.type === "claimable")
//       .reduce((total, balance) => total + parseFloat(balance.amount), 0)
//   }, [position.balances])

//   const primaryToken = position.balances[0]?.token

//   return (
//     <div className="flex w-full max-w-full justify-end gap-4 overflow-hidden">
//       <Button
//         // type="button"
//         // className="hover:bg-grey-800/20 text-md flex h-[5rem] min-w-80 max-w-full flex-col items-center justify-center gap-2 rounded border-2 border-transparent border-white p-6 font-normal"
//         onClick={onAddToPosition}
//       >
//         {t("Add to Position")}
//       </Button>
//       {hasClaimableRewards && (
//         <Button
//           type="button"
//           // className="flex h-[5rem] min-w-80 max-w-full flex-col items-center justify-center gap-1 rounded border-transparent bg-[#D5FF5C] p-6 text-black hover:bg-[#D5FF5C]/80"
//           primary
//           onClick={onClaimClick}
//         >
//           <div className="truncate text-sm font-normal text-black">{t("Claim")}</div>
//           <div className="text-grey-800 truncate text-[1rem] font-normal">
//             {claimableTokenAmount.toFixed(4)} {primaryToken?.symbol}
//           </div>
//         </Button>
//       )}
//     </div>
//   )
// }

// const YieldPositionSection: FC<{
//   balances: BalanceDto[]
//   title: string
//   onWithdraw?: (balance: BalanceDto) => void
// }> = ({ balances, title, onWithdraw }) => {
//   if (!balances.length) return null

//   return (
//     <div className="bg-black-secondary rounded-sm">
//       <div className="flex h-24 w-full max-w-full items-center overflow-hidden">
//         <div className="truncate px-8 text-base font-bold text-white">{title}</div>
//       </div>
//       {balances.map((balance, idx) => (
//         <YieldPositionItemRow key={idx} balance={balance} onWithdraw={onWithdraw} />
//       ))}
//     </div>
//   )
// }

// const YieldPositionItemRow: FC<{
//   balance: BalanceDto
//   onWithdraw?: (balance: BalanceDto) => void
// }> = ({ balance, onWithdraw: _onWithdraw }) => {
//   return (
//     <div className="flex h-[6.6rem] w-full items-center gap-8 overflow-hidden px-8">
//       <AssetLogo url={balance.token.logoURI} className="size-16" />
//       <div className="flex w-full grow flex-col gap-2 overflow-hidden">
//         <div className="text-body flex w-full items-center justify-between gap-8 overflow-hidden font-bold">
//           <div className="grow truncate">{balance.token.symbol}</div>
//           <div className="max-w-[50%] truncate">
//             {formatDecimals(balance.amount)} {balance.token.symbol}
//           </div>
//         </div>
//         <div className="text-body-secondary flex w-full items-center justify-between gap-8 overflow-hidden font-normal">
//           <div className="text-grey-400 grow truncate text-xs font-normal">
//             {balance.type.charAt(0).toUpperCase() + balance.type.slice(1)}
//           </div>
//           <div className="shrink-0">
//             <FiatFromUsd amount={parseFloat(balance.amountUsd || "0")} isBalance />
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
