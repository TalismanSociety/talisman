import { getMaxTransactionCost } from "@core/domains/ethereum/helpers"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { log } from "@core/log"
import { useQuery } from "@tanstack/react-query"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { ethers } from "ethers"
import { useTranslation } from "react-i18next"

import { useEthBalance } from "./useEthBalance"

export const useIsValidEthTransaction = (
  provider: ethers.providers.JsonRpcProvider | undefined,
  transaction: ethers.providers.TransactionRequest | undefined,
  priority: EthPriorityOptionName | undefined
) => {
  const { t } = useTranslation("request")
  const account = useAccountByAddress(transaction?.from)
  const { balance } = useEthBalance(provider, transaction?.from)

  const { data, error, isLoading } = useQuery({
    queryKey: [
      "useCheckTransaction",
      provider?.network?.chainId,
      transaction,
      account?.address,
      priority,
    ],
    queryFn: async () => {
      if (!provider || !transaction || !account || balance === undefined) return null

      if (account.origin === "WATCHED")
        throw new Error(t("Cannot sign transactions with a watched account"))

      // balance checks
      const value = ethers.BigNumber.from(transaction.value ?? 0)
      const maxTransactionCost = getMaxTransactionCost(transaction)
      if (!balance || value.gt(balance)) throw new Error(t("Insufficient balance"))
      if (!balance || maxTransactionCost.gt(balance))
        throw new Error(t("Insufficient balance to pay for fee"))

      // dry runs the transaction, if it fails we can't know for sure what the issue really is
      // there should be helpful message in the error though.
      log.debug("validating tx using estimateGas", transaction)
      const estimatedGas = await provider.estimateGas(transaction)
      return estimatedGas?.gt(0)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 0,
    keepPreviousData: true,
    enabled: !!provider && !!transaction && !!account && balance !== undefined,
  })

  return { isValid: !!data, error, isLoading }
}
