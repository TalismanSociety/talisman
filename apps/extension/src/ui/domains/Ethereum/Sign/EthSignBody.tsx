import { AccountJsonAny } from "@core/domains/accounts/types"
import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { TransactionInfo } from "@core/util/getEthTransactionInfo"
import { FadeIn } from "@talisman/components/FadeIn"
import { ethers } from "ethers"
import { FC } from "react"
import { EthSignBodyDefault } from "./EthSignBodyDefault"
import { EthSignBodyErc20Approve } from "./EthSignBodyErc20Approve"
import { EthSignBodyErc20Transfer } from "./EthSignBodyErc20Transfer"
import { EthSignBodyErc721Approve } from "./EthSignBodyErc721Approve"
import { EthSignBodyErc721ApproveAll } from "./EthSignBodyErc721ApproveAll"
import { EthSignBodyErc721Transfer } from "./EthSignBodyErc721Transfer"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"

type EthSignBodyProps = {
  transactionInfo?: TransactionInfo
  isReady: boolean
}

export const EthSignBody: FC<EthSignBodyProps> = ({ transactionInfo, isReady }) => {
  if (!isReady || !transactionInfo) return <EthSignBodyShimmer />

  const { contractType, contractCall } = transactionInfo

  switch (`${contractType}.${contractCall?.name}`) {
    case "ERC20.transfer":
      return <EthSignBodyErc20Transfer />
    case "ERC20.approve":
      return <EthSignBodyErc20Approve />
    case "ERC721.setApprovalForAll":
      return <EthSignBodyErc721ApproveAll />
    case "ERC721.approve":
      return <EthSignBodyErc721Approve />
    case "ERC721.transferFrom":
    case "ERC721.safeTransferFrom":
      return <EthSignBodyErc721Transfer />
    default:
      return <EthSignBodyDefault />
  }
}
