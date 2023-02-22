import { Balance, BalanceFormatter } from "@core/domains/balances/types"
import { EthGasSettings } from "@core/domains/ethereum/types"
import { EthPriorityOptionName, SignerPayloadJSON } from "@core/domains/signing/types"
import { Token } from "@core/domains/tokens/types"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"

export type TransferableTokenId = string

export type TransferableToken = {
  id: TransferableTokenId
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  token: Token
}

export type TokenBalanceInfo = {
  symbol: string
  decimals: number
  existentialDeposit: BalanceFormatter
  balance: Balance
}
export type TokenAmountInfo = {
  symbol: string
  decimals: number
  amount: BalanceFormatter
  existentialDeposit: BalanceFormatter
}

export type SendTokensInputs = {
  amount: string
  transferableTokenId: TransferableTokenId
  from: string
  to: string
  tip?: string
  priority?: EthPriorityOptionName
}

export type SendTokensData = SendTokensInputs & {
  gasSettings?: EthGasSettings
}

export type SendTokensExpectedResult =
  | {
      type: "substrate"
      transfer: TokenAmountInfo
      fees: TokenAmountInfo
      forfeits: TokenAmountInfo[]
      unsigned: SignerPayloadJSON
    }
  | {
      type: "evm"
      transfer: TokenAmountInfo
      fees?: TokenAmountInfo
    }
