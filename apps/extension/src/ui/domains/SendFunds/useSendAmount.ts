import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { EthGasSettingsEip1559, EthGasSettingsLegacy } from "@core/domains/ethereum/types"
import { AssetTransferMethod } from "@core/domains/transactions/types"
import { provideContext } from "@talisman/util/provideContext"
import { BalanceFormatter } from "@talismn/balances"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useBalance } from "@ui/hooks/useBalance"
import useChain from "@ui/hooks/useChain"
import { useDebouncedMemo } from "@ui/hooks/useDebouncedMemo"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { BigNumber, ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"

import { useEthTransaction } from "../Ethereum/useEthTransaction"
import { useFeeToken } from "./useFeeToken"

const useEvmTransaction = (
  tokenId?: string,
  from?: string,
  to?: string,
  amount?: string,
  isLocked?: boolean
) => {
  const token = useToken(tokenId)

  const [tx, setTx] = useState<ethers.providers.TransactionRequest>()

  useEffect(() => {
    if (!isEvmToken(token) || !token.evmNetwork?.id || !from || !token || !amount || !to)
      setTx(undefined)
    else {
      getEthTransferTransactionBase(token.evmNetwork.id, from, to, token, amount)
        .then(setTx)
        .catch((err) => {
          setTx(undefined)
          // eslint-disable-next-line no-console
          console.error("Failed to populate transaction", { err })
        })
    }
  }, [from, to, token, amount])

  const result = useEthTransaction(tx, isLocked)

  return tx ? { tx, ...result } : undefined
}

const useSubTransaction = (
  tokenId?: string,
  from?: string,
  to?: string,
  amount?: string,
  tip?: string,
  method?: AssetTransferMethod,
  isLocked?: boolean
) => {
  const token = useToken(tokenId)

  const qSubstrateEstimateFee = useQuery({
    queryKey: ["estimateFee", from, to, token?.id, amount, tip, method],
    queryFn: async () => {
      if (!token?.chain?.id || !from || !to || !amount) return null
      const { partialFee, unsigned, pendingTransferId } = await api.assetTransferCheckFees(
        token.chain.id,
        token.id,
        from,
        to,
        amount,
        tip ?? "0",
        method
      )
      return { partialFee, unsigned, pendingTransferId }
    },
    refetchInterval: 10_000,
    enabled: !isLocked,
  })

  return useMemo(() => {
    if (!isSubToken(token)) return undefined

    const { partialFee, unsigned, pendingTransferId } = qSubstrateEstimateFee.data ?? {}
    const { isLoading, isRefetching, error } = qSubstrateEstimateFee

    return { partialFee, unsigned, pendingTransferId, isLoading, isRefetching, error }
  }, [qSubstrateEstimateFee, token])
}

const getEvmMaxFee = (gasSettings: EthGasSettingsLegacy | EthGasSettingsEip1559) => {
  switch (gasSettings.type) {
    case 0:
      return BigNumber.from(gasSettings.gasLimit).mul(gasSettings.gasPrice).toBigInt()
    case 2:
      return BigNumber.from(gasSettings.maxFeePerGas).toBigInt()
  }
}

const useSendFundsProvider = () => {
  const { from, to, tokenId, amount, allowReap, sendMax } = useSendFundsWizard()
  const [isLocked, setIsLocked] = useState(false)

  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const balance = useBalance(from as string, tokenId as string)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const chain = useChain(token?.chain?.id)
  const tipToken = useToken(chain?.nativeToken?.id)
  const tipTokenRates = useTokenRates(chain?.nativeToken?.id)
  const tipTokenBalance = useBalance(from as string, tipToken?.id as string)
  const feeToken = useFeeToken(tokenId)
  const feeTokenBalance = useBalance(from as string, feeToken?.id as string)
  const feeTokenRates = useTokenRates(feeToken?.id)

  const { tip: tipPlanck } = useTip(token?.chain?.id, !isLocked)
  const tip = useMemo(
    () => (tipPlanck ? new BalanceFormatter(tipPlanck, tipToken?.decimals) : null),
    [tipPlanck, tipToken?.decimals]
  )

  const method: AssetTransferMethod = sendMax
    ? "transferAll"
    : allowReap
    ? "transfer"
    : "transferKeepAlive"

  const [sendAmountEstimate, setSendAmountEstimate] = useState("0")

  useEffect(() => {
    //console.log("reinitializing sendAmountEstimate", amount)
    setSendAmountEstimate(amount ?? "0")
  }, [amount])

  const evmTransaction = useEvmTransaction(tokenId, from, to, sendAmountEstimate, isLocked)
  const subTransaction = useSubTransaction(
    tokenId,
    from,
    to,
    sendAmountEstimate,
    tip?.planck.toString(),
    method,
    isLocked
  )

  // small debounce in case send max triggers another fee check, prevents loader from flickering
  const sendAmountLive = useMemo(() => {
    if (sendMax) {
      if (!balance || !token) return null

      switch (token.type) {
        case "evm-native": {
          return evmTransaction?.txDetails?.maxFee
            ? new BalanceFormatter(
                balance.transferable.planck -
                  BigNumber.from(evmTransaction.txDetails.maxFee).toBigInt(),
                token.decimals,
                tokenRates
              )
            : null

          // TODO what if fee higher than balance
        }

        case "substrate-native":
          return subTransaction?.partialFee
            ? new BalanceFormatter(
                balance.transferable.planck - BigInt(subTransaction?.partialFee),
                token.decimals,
                tokenRates
              )
            : null

        default: {
          const tipPlanck = tipToken?.id === token.id ? tip?.planck ?? 0n : 0n
          // other tokens don't use same token to pay fee, just send all transferable balance
          return new BalanceFormatter(
            balance.transferable.planck - tipPlanck,
            token.decimals,
            tokenRates
          )
        }
      }
    }

    return amount && token ? new BalanceFormatter(amount ?? "0", token.decimals, tokenRates) : null
  }, [
    amount,
    balance,
    evmTransaction?.txDetails?.maxFee,
    sendMax,
    subTransaction?.partialFee,
    tip?.planck,
    tipToken?.id,
    token,
    tokenRates,
  ])

  useEffect(() => {
    if (sendAmountLive && sendAmountLive?.planck.toString() !== sendAmountEstimate) {
      //console.log("updating sendAmountEstimate", sendAmountLive?.planck.toString())
      setSendAmountEstimate(sendAmountLive?.planck.toString() ?? "0")
    }
  }, [sendAmountLive, sendAmountLive?.planck, sendAmountEstimate])

  const estimatedFeeLive = useMemo(() => {
    if (evmTransaction?.txDetails?.estimatedFee) {
      return new BalanceFormatter(
        BigNumber.from(evmTransaction.txDetails.estimatedFee).toBigInt(),
        feeToken?.decimals,
        tokenRates
      )
    }
    if (subTransaction?.partialFee) {
      return new BalanceFormatter(BigInt(subTransaction.partialFee), feeToken?.decimals, tokenRates)
    }
    return null
  }, [
    evmTransaction?.txDetails?.estimatedFee,
    feeToken?.decimals,
    subTransaction?.partialFee,
    tokenRates,
  ])

  const isLoading = evmTransaction?.isLoading || subTransaction?.isLoading
  const error = evmTransaction?.error || subTransaction?.error
  const isRefetching = subTransaction?.isRefetching // TODO evm refetching

  // debounce to prevent "Estimateing max amount...", and the fee, from flickering on the UI (changing amount instantly triggers fee refetch)
  const sendAmount = useDebouncedMemo(() => sendAmountLive, 50, [sendAmountLive])
  const estimatedFee = useDebouncedMemo(() => estimatedFeeLive, 50, [estimatedFeeLive])

  return {
    chain,
    evmNetwork,
    evmTransaction,
    subTransaction,
    method,
    token,
    balance,
    tokenRates,
    sendAmount,
    estimatedFee,
    feeToken,
    feeTokenBalance,
    feeTokenRates,
    tip,
    tipToken,
    tipTokenBalance,
    tipTokenRates,
    isLoading,
    isRefetching,
    error,
    isLocked,
    setIsLocked,
  }
}

export const [SendFundsProvider, useSendFunds] = provideContext(useSendFundsProvider)
