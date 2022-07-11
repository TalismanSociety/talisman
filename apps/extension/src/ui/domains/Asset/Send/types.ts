import { Balance, BalanceFormatter } from "@core/domains/balances/types"
import { TokenId } from "@core/domains/tokens/types"
import { SignerPayloadJSON } from "@core/types"

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
  tokenId: TokenId
  from: string
  to: string
  tip: string
}

export type SendTokensExpectedResult = {
  transfer: TokenAmountInfo
  fees: TokenAmountInfo
  forfeits: TokenAmountInfo[]
  pendingTransferId?: string
  unsigned: SignerPayloadJSON
}
