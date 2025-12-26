// import { ProductTokenLogo } from "../ProductItem"
// import { useWithdrawFundsContext } from "../WithdrawFundsProvider"

// export const AssetRow = () => {
//   const { product, token } = useWithdrawFundsContext()

//   if (!product) return null

//   const apy = (product.rewardRate.total * 100).toFixed(2)
//   const apyUnit = product.rewardRate.rateType
//   const yieldName = product.metadata.name || `${product.inputTokens?.[0]?.symbol} Yield`
//   const yieldLogo = product.metadata.logoURI

//   return (
//     <div className="flex w-full items-center justify-between">
//       <div className="text-grey-400 text-sm">Asset</div>
//       <div className="flex items-center gap-2">
//         <div className="flex items-center gap-2">
//           <ProductTokenLogo protocolLogo={yieldLogo} tokenId={token?.id} className="h-10 w-10" />
//           <div className="!max-w-48 truncate text-white">{yieldName}</div>
//         </div>
//         <div className="text-grey-500 text-sm">
//           {apy}% {apyUnit}
//         </div>
//       </div>
//     </div>
//   )
// }
