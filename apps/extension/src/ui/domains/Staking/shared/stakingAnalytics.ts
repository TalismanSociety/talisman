import { type AmountBucket, toAmountBucket } from "@common/analytics/buckets"
import { networkIdForAnalytics } from "@common/analytics/funds"
import { symbolForAnalytics, toSlippagePercent } from "@common/analytics/schema"
import { type Signer, signerOf } from "@common/analytics/transactions"
import type { Network } from "@talismn/chaindata-provider"
import type { AccountType } from "@talismn/keyring"
import type { Hex } from "viem"

type ValueInput = {
  account: { type: AccountType } | null | undefined
  network: Network | null | undefined
  symbol: string | null | undefined
  usd: number | null | undefined
}

export type ValueReport = {
  network_id: string
  symbol: string
  signer: Signer
  usd_bucket: AmountBucket
}

export const valueReport = ({ account, network, symbol, usd }: ValueInput): ValueReport | null => {
  const signer = account && signerOf(account.type)
  if (!signer) return null
  return {
    network_id: networkIdForAnalytics(network),
    symbol: symbolForAnalytics(symbol),
    signer,
    usd_bucket: toAmountBucket(usd),
  }
}

export type StakingSlippage = { percent: number; isDefault: boolean }

export const stakingSubmittedReport = ({
  slippage = null,
  ...value
}: ValueInput & { slippage?: StakingSlippage | null }) => {
  const report = valueReport(value)
  return (
    report && {
      ...report,
      slippage_percent: slippage ? toSlippagePercent(slippage.percent) : null,
      slippage_is_default: slippage?.isDefault ?? null,
    }
  )
}

export const stakingTransactionId = (hash: Hex, innerHash?: Hex): string => innerHash ?? hash
