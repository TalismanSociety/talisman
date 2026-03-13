import type { EthTransactionDetails } from "@core/domains/signing/types"

type HasEthFeeEstimateErrorParams = {
  exchangeError: unknown
  ethError: unknown
  txDetails: EthTransactionDetails | undefined
}

export const hasEthFeeEstimateError = ({
  exchangeError,
  ethError,
  txDetails,
}: HasEthFeeEstimateErrorParams) => {
  if (exchangeError) return true
  if (!ethError) return false

  // Transaction validation errors can coexist with a computed fee.
  // In that case we still want to display the fee estimate.
  return !txDetails
}
