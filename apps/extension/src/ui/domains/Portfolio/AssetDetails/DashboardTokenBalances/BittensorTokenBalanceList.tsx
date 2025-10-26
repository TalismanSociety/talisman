// import { BalanceFormatter, Balances,
// //  ONE_ALPHA_TOKEN, SCALE_FACTOR
//  } from "@talismn/balances"
// import { BalancesStatus } from "@talismn/balances-react"
// import { Token, TokenId } from "@talismn/chaindata-provider"
// import { type TokenRates } from "@talismn/token-rates"
// import { classNames } from "@talismn/util"
// import BigNumber from "bignumber.js"
// import { ReactNode, Suspense } from "react"
// import { useTranslation } from "react-i18next"

// import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
// import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
// import { Fiat } from "@ui/domains/Asset/Fiat"
// import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
// import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
// import { type TokenBalances } from "@ui/domains/Portfolio/AssetDetails/useTokenBalances"
// import { StakeType } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondWizard"
// import { CHAIN_INFO, DTAO_LOGO, ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
// import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
// import { type CombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
// import { useSelectedCurrency } from "@ui/state"

// import { AssetBalanceCellValue } from "../../AssetBalanceCellValue"
// import { type BalanceSummary } from "../../useTokenBalancesSummary"
// import { calculateTaoFromAlphaStaked } from "../../utils/subtensor"
// import { CopyAddressButton } from "../CopyAddressIconButton"
// import { SendFundsTokenButton } from "../SendFundsTokenIconButton"
// import { TokenContextMenu } from "../TokenContextMenu"
// import { type BalanceDetailRow } from "../useTokenBalances"
// import { AssetPercentageChange } from "./AssetPercentageChange"
// import { TokenBalancesDetailRow } from "./TokenBalancesDetailRow"

// type BittensorTokenBalanceProps = {
//   groupedStakesByNetuid: BalanceDetailRow[]
//   listKey: string
//   combinedSubnetData: CombinedSubnetData
//   tokenBalances: TokenBalances
//   tokenRates: TokenRates | null
//   balances: Balances
//   tokenId: TokenId
// }

// export const BittensorTokenBalanceList = ({
//   listKey,
//   groupedStakesByNetuid,
//   combinedSubnetData,
//   tokenBalances,
//   tokenRates,
//   balances,
//   tokenId,
// }: BittensorTokenBalanceProps) => {
//   const currency = useSelectedCurrency()
//   const isChainIfo = listKey === CHAIN_INFO
//   const isRootStake = Number(listKey) === ROOT_NETUID
//   const [fistGroupStake] = groupedStakesByNetuid ?? []
//   const { network: chainOrNetwork, summary, token, detailRows, status } = tokenBalances
//   const { subnetData, isError, isLoading, isFetchingNextPage } = combinedSubnetData
//   const {
//     price_change_1_day,
//     subnet_name,
//     alpha_in_pool,
//     total_tao,
//     symbol: subnetTokenSymbol,
//   } = subnetData[Number(listKey)] ?? {}

//   // wait for data to load
//   if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

//   // Destruct data from the first stake in the group, as the data is the destructed data is the  same for all stakes in the group
//   const {
//     meta: {
//       alphaToTaoRate,
//       dynamicInfo: {
//         subnetIdentity: { subnetName = subnet_name } = {},
//         tokenSymbol = subnetTokenSymbol,
//       } = {},
//     } = {},
//   } = fistGroupStake

//   const defaultSummary = {
//     availableFiat: 0,
//     availableTokens: BigNumber(0),
//     lockedFiat: 0,
//     lockedTokens: BigNumber(0),
//     totalFiat: 0,
//     totalTokens: BigNumber(0),
//   }

//   const groupSummary =
//     groupedStakesByNetuid?.reduce<BalanceSummary>((acc, { fiat, meta: { amountStaked } = {} }) => {
//       return {
//         ...acc,
//         lockedFiat: acc.lockedFiat! + (fiat || 0),
//         lockedTokens: acc.lockedTokens.plus(
//           BigNumber(amountStaked / Number(SCALE_FACTOR.toString())),
//         ),
//       }
//     }, defaultSummary) ?? defaultSummary

//   const taoStatsRate = Math.trunc(
//     calculateTaoFromAlphaStaked({
//       alphaIn: Number(alpha_in_pool),
//       taoIn: Number(total_tao),
//       alphaStaked: Number(ONE_ALPHA_TOKEN.toString()),
//     }),
//   ).toString()

//   const subnetListName = `${listKey} | ${subnetName} ${tokenSymbol || ""}`.trim()
//   const chainName = isRootStake || isChainIfo ? chainOrNetwork.name || "" : subnetListName

//   const rowSummary = isChainIfo ? summary : groupSummary
//   const symbol = isRootStake ? token.symbol : tokenSymbol

//   const formatter = new BalanceFormatter(
//     BigInt(Number(alphaToTaoRate) > 0 ? alphaToTaoRate : taoStatsRate),
//     token?.decimals,
//     tokenRates,
//   )

//   const assetPriceInfo = !isRootStake && !isChainIfo && (
//     <div className="flex items-center space-x-2">
//       <Fiat amount={formatter?.fiat(currency) ?? 0} noCountUp />
//       <AssetPercentageChange
//         priceChange={price_change_1_day}
//         isError={isError}
//         isLoading={isFetchingNextPage || isLoading}
//       />
//     </div>
//   )

//   const rowNetworkType = isChainIfo ? "NETWORK TYPE" : isRootStake ? "Root" : ""

//   return (
//     <TokenBalancesList
//       stakeType={isRootStake || isChainIfo ? "root" : "subnet"}
//       netuid={Number(listKey)}
//       tokenId={tokenId}
//       token={token}
//       tokenLogoUrl={!isChainIfo && !isRootStake ? DTAO_LOGO : undefined}
//       balances={balances}
//       detailRowsLength={detailRows.length}
//       chainOrNetworkId={chainOrNetwork.id}
//       chainOrNetworkName={chainName}
//       assetPriceInfo={assetPriceInfo}
//       networkType={rowNetworkType}
//       summary={rowSummary}
//       status={status}
//       symbol={symbol}
//       shouldDisplayActionBtns={isChainIfo}
//       shouldDisplayTotalAvailableBalance={isChainIfo}
//     >
//       {groupedStakesByNetuid?.map((row, i, rows) => {
//         const { meta: { dynamicInfo = {} } = {}, title } = row

//         const balanceDetailSymbol = title.toLowerCase().includes("subnet")
//           ? dynamicInfo?.tokenSymbol
//           : symbol

//         return (
//           <TokenBalancesDetailRow
//             netuid={Number(listKey)}
//             key={row.key}
//             row={row}
//             isLastRow={rows.length === i + 1}
//             symbol={balanceDetailSymbol}
//             status={status}
//             tokenId={tokenId}
//             tokenDecimals={token.decimals}
//           />
//         )
//       })}
//     </TokenBalancesList>
//   )
// }

// type TokenBalancesListProps = {
//   tokenId: TokenId
//   token: Token | null
//   tokenLogoUrl?: string
//   balances: Balances
//   detailRowsLength: number
//   chainOrNetworkId: string
//   chainOrNetworkName: string
//   networkType?: string
//   assetPriceInfo?: ReactNode
//   summary: BalanceSummary
//   status: BalancesStatus
//   children: ReactNode
//   symbol: string
//   shouldDisplayActionBtns?: boolean
//   shouldDisplayTotalAvailableBalance?: boolean
//   stakeType?: StakeType
//   netuid?: number
// }

// export const TokenBalancesList = ({
//   tokenId,
//   token,
//   tokenLogoUrl,
//   balances,
//   detailRowsLength,
//   chainOrNetworkId,
//   chainOrNetworkName,
//   networkType,
//   assetPriceInfo,
//   summary,
//   status,
//   children,
//   symbol,
//   shouldDisplayActionBtns = true,
//   shouldDisplayTotalAvailableBalance = true,
//   stakeType,
//   netuid,
// }: TokenBalancesListProps) => {
//   const { t } = useTranslation()

//   if (!token) return null

//   return (
//     <div className="mb-8">
//       <div
//         className={classNames(
//           "bg-grey-800 grid grid-cols-[40%_30%_30%]",
//           detailRowsLength ? "rounded-t" : "rounded",
//         )}
//       >
//         <div className="flex">
//           <div className="shrink-0 p-8 text-xl">
//             {tokenLogoUrl ? <AssetLogo url={tokenLogoUrl} /> : <TokenLogo tokenId={tokenId} />}
//           </div>
//           <div className="flex grow flex-col justify-center gap-2 whitespace-nowrap">
//             <div className="base text-body flex items-center font-bold">
//               <NetworkLogo className="mr-2" networkId={chainOrNetworkId} />
//               <span className="mr-2">{chainOrNetworkName}</span>
//               {shouldDisplayActionBtns && (
//                 <>
//                   <CopyAddressButton networkId={chainOrNetworkId} />
//                   <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
//                     <SendFundsTokenButton tokenId={tokenId} />
//                     {tokenId && (
//                       <TokenContextMenu
//                         tokenId={tokenId}
//                         placement="bottom-start"
//                         className="text-body-secondary hover:text-body focus:text-body hover:bg-grey-700 focus-visible:bg-grey-700 rounded-xs inline-flex h-9 w-9 items-center justify-center p-0 text-xs opacity-50"
//                       />
//                     )}
//                   </Suspense>
//                 </>
//               )}
//             </div>
//             {assetPriceInfo && assetPriceInfo}
//             {networkType && <div>{networkType}</div>}
//           </div>
//         </div>
//         <div>
//           <AssetBalanceCellValue
//             locked
//             render={summary.lockedTokens.gt(0)}
//             tokens={summary.lockedTokens}
//             fiat={summary.lockedFiat}
//             symbol={symbol}
//             tooltip={t("Total Locked Balance")}
//             balancesStatus={status}
//             className={classNames(
//               status.status === "fetching" && "animate-pulse transition-opacity",
//             )}
//           />
//         </div>
//         <div className="flex items-center justify-end">
//           <div className={classNames(!shouldDisplayTotalAvailableBalance && "pr-8")}>
//             <BondButton balances={balances} stakeType={stakeType} netuid={netuid} />
//           </div>
//           <AssetBalanceCellValue
//             render={shouldDisplayTotalAvailableBalance}
//             tokens={summary.availableTokens}
//             fiat={summary.availableFiat}
//             symbol={symbol}
//             tooltip={t("Total Available Balance")}
//             balancesStatus={status}
//             className={classNames(
//               status.status === "fetching" && "animate-pulse transition-opacity",
//             )}
//           />
//         </div>
//       </div>
//       {children}
//     </div>
//   )
// }
