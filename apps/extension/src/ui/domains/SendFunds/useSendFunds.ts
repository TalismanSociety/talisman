import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { AssetTransferMethod } from "@core/domains/transactions/types"
import { log } from "@core/log"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { Address, Balance, BalanceFormatter } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { formatDecimals } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useBalancesHydrate } from "@ui/hooks/useBalancesHydrate"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import useTokens from "@ui/hooks/useTokens"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { BigNumber, ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useEthTransaction } from "../Ethereum/useEthTransaction"
import { useFeeToken } from "./useFeeToken"

type SignMethod = "normal" | "ledgerSubstrate" | "ledgerEthereum" | "unknown"

const useRecipientBalance = (token?: Token, address?: Address | null) => {
  const hydrate = useBalancesHydrate()

  return useQuery({
    queryKey: [token?.id, address, hydrate],
    queryFn: async () => {
      if (!token || !token.chain || !address || !hydrate) return null
      const storage = await api.getBalance({ chainId: token.chain.id, address, tokenId: token.id })
      if (!storage) throw Error("Could not fetch recipient balance.")
      return storage ? new Balance(storage, hydrate) : null
    },
    retry: false,
    refetchInterval: 10_000,
  })
}

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

const useSendFundsProvider = () => {
  const { from, to, tokenId, amount, allowReap, sendMax, set, gotoProgress } = useSendFundsWizard()
  const [isLocked, setIsLocked] = useState(false)

  const fromAccount = useAccountByAddress(from)
  const { tokensMap } = useTokens(true)
  const balances = useBalancesByAddress(from as string)
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

  const transfer = useMemo(
    () => (token && amount ? new BalanceFormatter(amount, token.decimals, tokenRates) : null),
    [amount, token, tokenRates]
  )

  const { requiresTip, tip: tipPlanck } = useTip(token?.chain?.id, !isLocked)
  const tip = useMemo(
    () => (tipPlanck ? new BalanceFormatter(tipPlanck, tipToken?.decimals) : null),
    [tipPlanck, tipToken?.decimals]
  )

  const method: AssetTransferMethod = sendMax
    ? "transferAll"
    : allowReap
    ? "transfer"
    : "transferKeepAlive"

  const evmTransaction = useEvmTransaction(tokenId, from, to, amount ?? "0", isLocked)
  const subTransaction = useSubTransaction(
    tokenId,
    from,
    to,
    amount ?? "0",
    tip?.planck.toString(),
    method,
    isLocked
  )

  const maxAmount = useMemo(() => {
    if (!balance || !token) return null

    try {
      const tipPlanck = tipToken?.id === token.id ? tip?.planck ?? 0n : 0n

      switch (token.type) {
        case "substrate-native":
          return subTransaction?.partialFee
            ? new BalanceFormatter(
                balance.transferable.planck - BigInt(subTransaction.partialFee) - tipPlanck,
                token.decimals,
                tokenRates
              )
            : null
        case "evm-native":
          return evmTransaction?.txDetails?.maxFee
            ? new BalanceFormatter(
                balance.transferable.planck -
                  BigNumber.from(evmTransaction.txDetails.maxFee).toBigInt(),
                token.decimals,
                tokenRates
              )
            : null
        default:
          return new BalanceFormatter(amount ?? "0", token.decimals, tokenRates)
      }
    } catch (err) {
      log.error("Failed to compute max amount", { err })
      return null
    }
  }, [
    amount,
    balance,
    evmTransaction?.txDetails?.maxFee,
    subTransaction?.partialFee,
    tip?.planck,
    tipToken?.id,
    token,
    tokenRates,
  ])

  const estimatedFee = useMemo(() => {
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

  const costBreakdown = useMemo(() => {
    try {
      const transferAmount = sendMax ? maxAmount : transfer
      if (
        !token ||
        !feeToken ||
        !transferAmount ||
        !estimatedFee ||
        (requiresTip && (!tip || !tipToken))
      )
        return null

      const spend: Record<TokenId, bigint> = {}
      spend[token.id] = transferAmount.planck
      spend[feeToken.id] = (spend[feeToken.id] ?? 0n) + estimatedFee.planck
      if (tip && tipToken && tip.planck > 0n)
        spend[tipToken.id] = (spend[tipToken.id] ?? 0n) + tip.planck

      return Object.entries(spend).map(([tokenId, amount]) => ({
        token: tokensMap[tokenId],
        cost: new BalanceFormatter(amount, tokensMap[tokenId].decimals, tokenRates),
        balance: new BalanceFormatter(
          balances.find({ tokenId }).sorted[0]?.transferable.planck,
          tokensMap[tokenId].decimals,
          tokenRates
        ),
      }))
    } catch (err) {
      log.error("Failed to compute cost breakdown", { err })
      return null
    }
  }, [
    balances,
    estimatedFee,
    feeToken,
    maxAmount,
    requiresTip,
    sendMax,
    tip,
    tipToken,
    token,
    tokenRates,
    tokensMap,
    transfer,
  ])

  const tokensToBeReaped = useMemo(() => {
    return costBreakdown
      ?.map(({ token, cost, balance }) => {
        const remaining = balance.planck - cost.planck

        if (remaining > 0n || !isSubToken(token) || sendMax) return null

        const existentialDeposit = new BalanceFormatter(
          token.existentialDeposit ?? "0",
          token.decimals,
          tokenRates
        )

        return remaining < existentialDeposit.planck
          ? {
              token,
              existentialDeposit,
              amount: new BalanceFormatter(remaining, token.decimals, tokenRates),
            }
          : null
      })
      .filter(Boolean) as
      | {
          token: Token
          existentialDeposit: BalanceFormatter
          amount: BalanceFormatter
        }[]
      | undefined
  }, [costBreakdown, sendMax, tokenRates])

  // TODO proper hook
  const {
    data: recipientBalance,
    isLoading: recipientBalanceIsLoading,
    error: recipientBalanceError,
  } = useRecipientBalance(token, to)
  const isSendingEnough = useMemo(() => {
    try {
      if (!token || !recipientBalance || !transfer) return true
      switch (token.type) {
        case "evm-erc20":
        case "evm-native":
          return true
        case "substrate-native":
        case "substrate-orml":
        case "substrate-assets":
        case "substrate-equilibrium":
        case "substrate-tokens": {
          const existentialDeposit = new BalanceFormatter(
            token.existentialDeposit ?? "0",
            token.decimals
          )

          return (
            transfer.planck === 0n ||
            recipientBalance.total.planck > 0n ||
            transfer.planck >= existentialDeposit.planck
          )
        }
      }
    } catch (err) {
      log.error("isSendingEnough", { err })
      return false
    }
  }, [recipientBalance, token, transfer])

  const { isValid, error } = useMemo(() => {
    try {
      const txError = (evmTransaction?.error || subTransaction?.error) as Error

      if (txError)
        return {
          isValid: false,
          error: "Failed to validate transaction : " + txError.message,
        }

      if (
        !from ||
        !to ||
        !(transfer || (sendMax && maxAmount)) ||
        !tokenId ||
        !costBreakdown ||
        !tokensToBeReaped
      )
        return { isValid: false, error: undefined }

      for (const cost of costBreakdown)
        if (cost.balance.planck < cost.cost.planck)
          return { isValid: false, error: `Insufficient ${cost.token.symbol}` }

      if (!isSendingEnough && isSubToken(token)) {
        const ed = new BalanceFormatter(token.existentialDeposit, token.decimals)
        return {
          isValid: false,
          error: `Please send a minimum of ${formatDecimals(ed.tokens)} ${token.symbol}`,
        }
      }

      return { isValid: true, error: undefined }
    } catch (err) {
      log.error("checkIsValid", { err })
      return { isValid: true, error: "Failed to validate" }
    }
  }, [
    costBreakdown,
    evmTransaction?.error,
    from,
    isSendingEnough,
    maxAmount,
    sendMax,
    subTransaction?.error,
    to,
    token,
    tokenId,
    tokensToBeReaped,
    transfer,
  ])

  const isLoading = evmTransaction?.isLoading || subTransaction?.isLoading

  const onSendMaxClick = useCallback(() => {
    if (!token || !maxAmount) return

    switch (token.type) {
      case "substrate-native": {
        set("sendMax", !sendMax)
        break
      }
      default: {
        set("amount", maxAmount.planck.toString())
        break
      }
    }
  }, [maxAmount, sendMax, set, token])

  const signMethod: SignMethod = useMemo(() => {
    if (!fromAccount || !token) return "unknown"
    if (fromAccount?.isHardware) {
      if (isSubToken(token)) return "ledgerSubstrate"
      else if (isEvmToken(token)) return "ledgerEthereum"
      else throw new Error("Unknown token type")
    }
    return "normal"
  }, [fromAccount, token])

  const [isProcessing, setIsProcessing] = useState(false)
  const [sendErrorMessage, setSendErrorMessage] = useState<string>()
  const send = useCallback(async () => {
    try {
      if (!from) throw new Error("Sender not found")
      if (!to) throw new Error("Recipient not found")
      if (!transfer && !sendMax) throw new Error("Amount not found")
      if (!token) throw new Error("Token not found")

      setIsProcessing(true)

      if (token.chain?.id) {
        const { id } = await api.assetTransfer(
          token.chain.id,
          token.id,
          from,
          to,
          transfer?.planck.toString(),
          tip?.planck.toString(),
          method
        )
        gotoProgress({ substrateTxId: id })
      } else if (token.evmNetwork?.id) {
        if (!transfer) throw new Error("Missing send amount")
        if (!evmTransaction?.gasSettings) throw new Error("Missing gas settings")
        const { hash } = await api.assetTransferEth(
          token.evmNetwork.id,
          token.id,
          from,
          to,
          transfer.planck.toString(),
          evmTransaction.gasSettings
        )
        gotoProgress({ evmNetworkId: token.evmNetwork.id, evmTxHash: hash })
      } else throw new Error("Unknown network")
    } catch (err) {
      log.error("Failed to submit tx", err)
      setSendErrorMessage((err as Error).message)
      setIsProcessing(false)
    }
  }, [
    from,
    to,
    transfer,
    sendMax,
    token,
    tip?.planck,
    method,
    gotoProgress,
    evmTransaction?.gasSettings,
  ])

  const sendWithSignature = useCallback(
    async (signature: HexString) => {
      try {
        setIsProcessing(true)
        if (subTransaction?.pendingTransferId) {
          // TODO get rid of pending transfer id
          const transfer = await api.assetTransferApproveSign(
            subTransaction.pendingTransferId,
            signature
          )
          gotoProgress({ substrateTxId: transfer.id })
          return
        }
        if (evmTransaction && amount && token?.evmNetwork?.id) {
          const { hash } = await api.assetTransferEthHardware(
            token?.evmNetwork.id,
            token.id,
            amount,
            signature
          )
          gotoProgress({ evmNetworkId: token?.evmNetwork?.id, evmTxHash: hash })
          return
        }
        throw new Error("Unknown transaction")
      } catch (err) {
        setSendErrorMessage((err as Error).message)
        setIsProcessing(false)
      }
    },
    [
      amount,
      evmTransaction,
      gotoProgress,
      subTransaction?.pendingTransferId,
      token?.evmNetwork?.id,
      token?.id,
    ]
  )

  return {
    from,
    to,
    tokenId,
    amount,
    transfer,
    sendMax,
    allowReap,
    onSendMaxClick,
    chain,
    evmNetwork,
    evmTransaction,
    subTransaction,
    method,
    token,
    balance,
    tokenRates,
    maxAmount,
    estimatedFee,
    feeToken,
    feeTokenBalance,
    feeTokenRates,
    tip,
    tipToken,
    tipTokenBalance,
    tipTokenRates,
    isLoading,
    error,
    isLocked,
    setIsLocked,
    isValid,
    tokensToBeReaped,
    send,
    sendWithSignature,
    signMethod,
    isProcessing,
    sendErrorMessage,
  }
}

export const [SendFundsProvider, useSendFunds] = provideContext(useSendFundsProvider)
