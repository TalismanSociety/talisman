import { Balance, BalanceFormatter, Balances } from "@core/domains/balances/types"
import { SignerPayloadJSON } from "@core/domains/signing/types"
import { Token, TokenId } from "@core/domains/tokens/types"

export type TransferableTokenId = string

export type TransferableToken = {
  id: TransferableTokenId
  chainId?: string
  evmNetworkId?: number
  token: Token
  balances: Balances
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
  tip: string
}

export type SendTokensExpectedResult =
  | {
      type: "substrate"
      transfer: TokenAmountInfo
      fees: TokenAmountInfo
      forfeits: TokenAmountInfo[]
      pendingTransferId?: string
      unsigned: SignerPayloadJSON
    }
  | {
      type: "evm"
      transfer: TokenAmountInfo
      fees?: TokenAmountInfo
      pendingTransferId?: string
    }
