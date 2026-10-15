import { attachErrorCategory, type ErrorCategory } from "@common/analytics/errorCategory"
import { getMaxTransactionCost, serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import type { EthPriorityOptionName } from "@core/domains/signing/types"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useAccountByAddress } from "@ui/state/accounts"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { PublicClient, TransactionRequest } from "viem"

import { useEthBalance } from "./useEthBalance"

const invalid = (message: string, category: ErrorCategory) =>
  attachErrorCategory(new Error(message), category)

export const useIsValidEthTransaction = (
  publicClient: PublicClient | undefined,
  tx: TransactionRequest | undefined,
  priority: EthPriorityOptionName | undefined,
  isReplacement = false
) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(tx?.from)
  const { balance } = useEthBalance(publicClient, tx?.from)

  const {
    data,
    error: liveError,
    isLoading,
  } = useQuery({
    queryKey: [
      "useIsValidEthTransaction",
      publicClient?.chain?.id,
      tx && serializeTransactionRequest(tx),
      account?.address,
      priority,
    ],
    queryFn: async () => {
      if (!publicClient || !tx || !account || balance === undefined) return null

      if (account.type === "watch-only")
        throw invalid(t("Cannot sign transactions with a watched account"), "unsupported")

      // balance checks
      const value = tx.value ?? 0n
      const maxTransactionCost = getMaxTransactionCost(tx)
      const nativeSymbol = publicClient.chain?.nativeCurrency?.symbol ?? "native token"
      if (typeof balance !== "bigint")
        throw invalid(t("Failed to load {{symbol}} balance", { symbol: nativeSymbol }), "rpc")
      if (value > balance)
        throw invalid(
          t("Insufficient {{symbol}} balance", { symbol: nativeSymbol }),
          "insufficient_balance"
        )
      if (maxTransactionCost > balance)
        throw invalid(
          t("Insufficient {{symbol}} balance to pay for fee", { symbol: nativeSymbol }),
          "insufficient_gas"
        )

      // dry runs the transaction, if it fails we can't know for sure what the issue really is
      // there should be helpful message in the error though.
      const estimatedGas = await publicClient.estimateGas({
        account: tx.from,
        ...tx,
        // unless it's a replacement tx, don't provide the nonce
        // otherwise it would throw a cryptic error on moonbeam networks if previous tx is not finalized
        nonce: isReplacement ? tx.nonce : undefined,
      })
      return estimatedGas > 0n
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 0,
    placeholderData: keepPreviousData,
    enabled: !!publicClient && !!tx && !!account && balance !== undefined,
  })

  // while loading, keep returning the previous error to prevent it from blinking on screen
  const [error, setError] = useState(() => liveError)
  useEffect(() => {
    if (!isLoading) setError(liveError)
  }, [isLoading, liveError])

  return { isValid: !!data, error, isLoading }
}
