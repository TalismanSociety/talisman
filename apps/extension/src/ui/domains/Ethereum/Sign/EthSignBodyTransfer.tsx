// import { AccountJsonAny } from "@core/domains/accounts/types"
// import { EvmNetwork, CustomEvmNetwork } from "@core/domains/ethereum/types"
// import { AccountPill } from "@ui/domains/Account/AccountPill"
// import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
// import useToken from "@ui/hooks/useToken"
// import { BigNumberish, ethers } from "ethers"
// import { FC } from "react"
// import { formatDecimals } from "talisman-utils"
// import { EthSignBodyShimmer } from "./EthSignBodyShimmer"
// import { EthTxBodyProps } from "./types"

// export const EthTxBodyTransfer: FC<EthTxBodyProps> = ({ account, network, request }) => {
//   // TODO pull account balance from network (not chain) and check for sufficient balance ?
//   const nativeToken = useToken(network.nativeToken?.id)

//   if (!nativeToken || !request.value) return <EthSignBodyShimmer />

//   return (
//     <>
//       <h1>Transfer Request</h1>
//       <h2>
//         You are transferring{" "}
//         <strong>
//           {formatDecimals(ethers.utils.formatUnits(request.value, nativeToken?.decimals))}{" "}
//           {nativeToken?.symbol}
//         </strong>
//         <br />
//         from <AccountPill account={account} />
//         {network ? ` on ${network.name}` : null}
//       </h2>
//       <div className="my-16 text-center">
//         <ViewDetailsEth />
//       </div>
//     </>
//   )
// }

export {}
