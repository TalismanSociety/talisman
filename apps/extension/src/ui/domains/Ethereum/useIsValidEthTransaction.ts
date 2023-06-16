import { EthPriorityOptionName } from "@core/domains/signing/types"
import { useQuery } from "@tanstack/react-query"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { ethers } from "ethers"
import { useTranslation } from "react-i18next"

export const useIsValidEthTransaction = (
  provider?: ethers.providers.JsonRpcProvider,
  transaction?: ethers.providers.TransactionRequest,
  priority?: EthPriorityOptionName
) => {
  const { t } = useTranslation("sign")
  const account = useAccountByAddress(transaction?.from)

  const { data, error, isLoading } = useQuery({
    queryKey: [
      "useCheckTransaction",
      provider?.network?.chainId,
      transaction,
      account?.address,
      priority,
    ],
    queryFn: async () => {
      if (!provider || !transaction || !account) {
        return null
      }

      if (account.origin === "WATCHED")
        throw new Error(t("Cannot sign transactions with a watched account"))

      // dry runs the transaction, if it fails we can't know for sure what the issue really is
      // there should be helpful message in the error though.
      const estimatedGas = await provider.estimateGas(transaction)
      return estimatedGas?.gt(0)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 0,
    keepPreviousData: true,
  })

  return { isValid: !!data, error, isLoading }
}
