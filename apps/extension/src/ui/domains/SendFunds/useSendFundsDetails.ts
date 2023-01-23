import { log } from "@core/log"
import { provideContext } from "@talisman/util/provideContext"
import { BalanceFormatter } from "@talismn/balances"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import BigNumber from "bignumber.js"
import { useEffect, useMemo } from "react"

import { getExtensionEthereumProvider } from "../Ethereum/getExtensionEthereumProvider"

const useFeeToken = (tokenId?: string | null) => {
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  const feeTokenId = useMemo(() => {
    if (!token) return null
    switch (token.type) {
      case "evm-erc20":
      case "evm-native":
        return evmNetwork?.nativeToken?.id
      case "substrate-native":
      case "substrate-orml":
        return chain?.nativeToken?.id
    }
  }, [chain?.nativeToken?.id, evmNetwork?.nativeToken?.id, token])

  return useToken(feeTokenId)
}

const useEstimateFee = (
  from?: string | null,
  to?: string | null,
  tokenId?: string | null,
  amount?: string | null
) => {
  const token = useToken(tokenId)

  return useQuery({
    queryKey: ["sendFunds", "estimateFee", from, to, token?.id, amount],
    queryFn: async () => {
      if (!token || !from || !to || !amount) return null
      switch (token.type) {
        case "evm-erc20":
        case "evm-native": {
          if (!token.evmNetwork) throw new Error("EVM Network not found")
          try {
            const provider = getExtensionEthereumProvider(token.evmNetwork.id)
            const [gasPrice, estimatedGas] = await Promise.all([
              provider.getGasPrice(),
              provider.estimateGas({ from, to, value: amount }),
            ])
            return gasPrice.mul(estimatedGas).toString()
          } catch (err) {
            if ((err as any)?.code === "INSUFFICIENT_FUNDS") throw new Error("Insufficient funds")
            throw (err as any).error ?? err
          }
        }
        case "substrate-native":
        case "substrate-orml": {
          const { partialFee, unsigned, pendingTransferId } = await api.assetTransferCheckFees(
            token.chain.id,
            token.id,
            from,
            to,
            amount,
            "0", //TODO tip ?? "0",
            false //TODO allowReap
          )
          return partialFee
        }
      }
    },
    retry: false,
  })
}

const useSendFundsDetailsProvider = () => {
  const { from, amount, tokenId } = useSendFunds()
  const fromAccount = useAccountByAddress(from)
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const chain = useChain(token?.chain?.id)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const balance = useBalance(from as string, tokenId as string)
  const sendAmount = useMemo(
    () =>
      amount && token ? new BalanceFormatter(amount ?? "0", token.decimals, tokenRates) : null,
    [amount, token, tokenRates]
  )

  const feeToken = useFeeToken(tokenId)
  const {
    data: estimatedFee,
    error: estimateFeeError,
    isFetching: isEstimatingFee,
  } = useEstimateFee(from, from, tokenId, amount)
  const feeTokenBalance = useBalance(from as string, feeToken?.id as string)

  const hasInsufficientFunds = useMemo(() => {
    if (amount && balance && BigInt(amount) > balance.transferable.planck) return true
    if (
      estimatedFee &&
      feeTokenBalance &&
      BigInt(estimatedFee) > feeTokenBalance.transferable.planck
    )
      return true
    // if token is also used to pay fee, ensure we can pay both transfer and fee
    if (
      balance &&
      feeTokenBalance &&
      balance.tokenId === feeTokenBalance.tokenId &&
      amount &&
      estimatedFee &&
      BigInt(amount) + BigInt(estimatedFee) > balance.transferable.planck
    )
      return true
    return false
  }, [amount, balance, estimatedFee, feeTokenBalance])

  const ctx = useMemo(
    () => ({
      token,
      tokenRates,
      sendAmount,
      fromAccount,
      chain,
      evmNetwork,
      balance,
      feeToken,
      estimatedFee,
      estimateFeeError: estimateFeeError as Error,
      isEstimatingFee,
      hasInsufficientFunds,
    }),
    [
      balance,
      chain,
      estimateFeeError,
      estimatedFee,
      evmNetwork,
      feeToken,
      fromAccount,
      sendAmount,
      token,
      tokenRates,
      isEstimatingFee,
      hasInsufficientFunds,
    ]
  )

  useEffect(() => {
    log.log("useSendFundsDetailsProvider", ctx)
  }, [ctx])

  return ctx
}

export const [SendFundsDetailsProvider, useSendFundsDetails] = provideContext(
  useSendFundsDetailsProvider
)
