import { AccountJsonAny } from "@core/domains/accounts/types"
import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { TransactionInfo } from "@core/util/getEthTransactionInfo"
import { ethers } from "ethers"

export type EthTxBodyProps = {
  network: EvmNetwork | CustomEvmNetwork
  account: AccountJsonAny
  request: ethers.providers.TransactionRequest
  transactionInfo: TransactionInfo
}
