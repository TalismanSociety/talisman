import { AccountJsonAny } from "@core/domains/accounts/types"
import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { TransactionInfo } from "@core/util/getEthTransactionInfo"
import { ethers } from "ethers"
import { FC } from "react"
import { EthSignBodyDefault } from "./EthSignBodyDefault"
import { EthSignBodyErc20Approve } from "./EthSignBodyErc20Approve"
import { EthSignBodyErc20Transfer } from "./EthSignBodyErc20Transfer"
import { EthSignBodyErc721ApproveAll } from "./EthSignBodyErc721ApproveAll"
import { EthSignBodyShimmer } from "./EthSignBodyShimmer"

type EthSignBodyProps = {
  network?: EvmNetwork | CustomEvmNetwork
  account?: AccountJsonAny
  request?: ethers.providers.TransactionRequest
  transactionInfo?: TransactionInfo
}

export const EthSignBody: FC<EthSignBodyProps> = ({
  network,
  account,
  request,
  transactionInfo,
}) => {
  if (!request || !transactionInfo || !network || !account) return <EthSignBodyShimmer />

  const { contractType, contractCall } = transactionInfo

  switch (`${contractType}.${contractCall?.name}`) {
    case "ERC20.transfer":
      return <EthSignBodyErc20Transfer />
    case "ERC20.approve":
      return <EthSignBodyErc20Approve />
    case "ERC721.setApprovalForAll":
      return <EthSignBodyErc721ApproveAll />
    default:
      return <EthSignBodyDefault />
  }
}
