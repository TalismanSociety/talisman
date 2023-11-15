import { getMaxTransactionCost, serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { useQuery } from "@tanstack/react-query"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useTranslation } from "react-i18next"
import { PublicClient, TransactionRequest } from "viem"

import { useEthBalance } from "./useEthBalance"

export const useIsValidEthTransaction = (
  publicClient: PublicClient | undefined,
  tx: TransactionRequest | undefined,
  priority: EthPriorityOptionName | undefined
) => {
  const { t } = useTranslation("request")
  const account = useAccountByAddress(tx?.from)
  const { balance } = useEthBalance(publicClient, tx?.from)

  const { data, error, isLoading } = useQuery({
    queryKey: [
      "useIsValidEthTransaction",
      publicClient?.chain?.id,
      tx && serializeTransactionRequest(tx),
      account?.address,
      priority,
    ],
    queryFn: async () => {
      if (!publicClient || !tx || !account || balance === undefined) return null

      if (account.origin === "WATCHED")
        throw new Error(t("Cannot sign transactions with a watched account"))

      // balance checks
      const value = tx.value ?? 0n
      const maxTransactionCost = getMaxTransactionCost(tx)
      if (!balance || value > balance) throw new Error(t("Insufficient balance"))
      if (!balance || maxTransactionCost > balance)
        throw new Error(t("Insufficient balance to pay for fee"))

      // dry runs the transaction, if it fails we can't know for sure what the issue really is
      // there should be helpful message in the error though.
      const estimatedGas = await publicClient.estimateGas({
        account: tx.from,
        ...tx,
      })
      return estimatedGas > 0n
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 0,
    keepPreviousData: true,
    enabled: !!publicClient && !!tx && !!account && balance !== undefined,
  })

  return { isValid: !!data, error, isLoading }
}
