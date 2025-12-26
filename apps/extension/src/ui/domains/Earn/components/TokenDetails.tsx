// import { TokenId } from "@talismn/chaindata-provider"
// import { FC } from "react"

// import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
// import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
// import { NetworkName } from "@ui/domains/Networks/NetworkName"

// interface TokenDetailsProps {
//   tokenId: TokenId
//   tokenSymbol?: string
//   networkId?: string
// }

// export const TokenDetails: FC<TokenDetailsProps> = ({ tokenId, tokenSymbol, networkId }) => {
//   return (
//     <>
//       {/* Token Header */}
//       <div className="pb-4">
//         <div className="flex items-center gap-3">
//           <TokenLogo tokenId={tokenId} className="h-10 w-10" />
//           <div>
//             <div className="flex items-center gap-2">
//               <span className="text-base font-semibold text-white">{tokenSymbol}</span>
//               <NetworkLogo networkId={networkId} className="h-4 w-4" />
//             </div>
//             <span className="text-xs text-gray-400">
//               <NetworkName networkId={networkId} />
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Divider */}
//       <div className="border-grey-800 h-0 border-t"></div>
//     </>
//   )
// }
