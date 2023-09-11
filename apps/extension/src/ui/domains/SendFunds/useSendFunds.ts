import { AccountTypes } from "@core/domains/accounts/types"
import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { AssetTransferMethod } from "@core/domains/transfers/types"
import { log } from "@core/log"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { Address, Balance, BalanceFormatter } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { formatDecimals, sleep } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useBalancesHydrate } from "@ui/hooks/useBalancesHydrate"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"
import useTokens from "@ui/hooks/useTokens"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { isTransferableToken } from "@ui/util/isTransferableToken"
import { BigNumber, ethers } from "ethers"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

import { useEthTransaction } from "../Ethereum/useEthTransaction"
import { useFeeToken } from "./useFeeToken"
import { useSendFundsInputNumber } from "./useSendFundsInputNumber"
import { useSendFundsInputSize } from "./useSendFundsInputSize"

type SignMethod = "normal" | "hardwareSubstrate" | "hardwareEthereum" | "qrSubstrate" | "unknown"

const useRecipientBalance = (token?: Token, address?: Address | null) => {
  const { t } = useTranslation("send-funds")
  const hydrate = useBalancesHydrate()

  return useQuery({
    queryKey: [token?.id, address, hydrate],
    queryFn: async () => {
      if (!token || !token.chain || !address || !hydrate) return null
      const storage = await api.getBalance({ chainId: token.chain.id, address, tokenId: token.id })
      if (!storage) throw Error(t("Could not fetch recipient balance."))
      return storage ? new Balance(storage, hydrate) : null
    },
    retry: false,
    refetchInterval: 10_000,
  })
}

const useIsSendingEnough = (
  recipientBalance?: Balance | null,
  token?: Token,
  transfer?: BalanceFormatter | null
) => {
  return useMemo(() => {
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
}

const useEvmTransaction = (
  tokenId?: string,
  from?: string,
  to?: string,
  amount?: string,
  isLocked?: boolean
) => {
  const token = useToken(tokenId)

  const [evmInvalidTxError, setEvmInvalidTxError] = useState<Error | undefined>()
  const [tx, setTx] = useState<ethers.providers.TransactionRequest>()

  useEffect(() => {
    setEvmInvalidTxError(undefined)
    if (!isEvmToken(token) || !token.evmNetwork?.id || !from || !token || !amount || !to)
      setTx(undefined)
    else {
      getEthTransferTransactionBase(token.evmNetwork.id, from, to, token, amount)
        .then(setTx)
        .catch((err) => {
          setEvmInvalidTxError(err)
          setTx(undefined)
          // eslint-disable-next-line no-console
          console.error("Failed to populate transaction", { err })
        })
    }
  }, [from, to, token, amount])

  const result = useEthTransaction(tx, isLocked)

  return { evmTransaction: tx ? { tx, ...result } : undefined, evmInvalidTxError }
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
      const { partialFee, unsigned } = await api.assetTransferCheckFees(
        token.chain.id,
        token.id,
        from,
        to,
        amount,
        tip ?? "0",
        method
      )
      return { partialFee, unsigned }
    },
    refetchInterval: false,
    enabled: !isLocked,
  })

  return useMemo(() => {
    if (!isSubToken(token)) return undefined

    const { partialFee, unsigned } = qSubstrateEstimateFee.data ?? {}
    const { isLoading, isRefetching, error } = qSubstrateEstimateFee

    return { partialFee, unsigned, isLoading, isRefetching, error }
  }, [qSubstrateEstimateFee, token])
}

const useSendFundsProvider = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, tokenId, amount, allowReap, sendMax, set, gotoProgress } = useSendFundsWizard()
  const [isLocked, setIsLocked] = useState(false)

  const fromAccount = useAccountByAddress(from)
  const { tokensMap } = useTokens(true)
  const tokenRatesMap = useTokenRatesMap()
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

  const refTokensInput = useRef<HTMLInputElement>(null)
  useSendFundsInputNumber(refTokensInput, token?.decimals)
  const resizeTokensInput = useSendFundsInputSize(refTokensInput)

  const refFiatInput = useRef<HTMLInputElement>(null)
  useSendFundsInputNumber(refFiatInput, 2)
  const resizeFiatInput = useSendFundsInputSize(refFiatInput)

  const transfer = useMemo(
    () => (token && amount ? new BalanceFormatter(amount, token.decimals, tokenRates) : null),
    [amount, token, tokenRates]
  )

  const { requiresTip, tip: tipPlanck } = useTip(token?.chain?.id, !isLocked)
  const tip = useMemo(
    () => (tipPlanck ? new BalanceFormatter(tipPlanck, tipToken?.decimals, tipTokenRates) : null),
    [tipPlanck, tipToken?.decimals, tipTokenRates]
  )

  const method: AssetTransferMethod = sendMax
    ? "transferAll"
    : allowReap
    ? "transfer"
    : "transferKeepAlive"

  const { evmTransaction, evmInvalidTxError } = useEvmTransaction(
    tokenId,
    from,
    to,
    amount ?? "0",
    isLocked
  )
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
        case "substrate-native": {
          if (!subTransaction?.partialFee) return null
          const val = balance.transferable.planck - BigInt(subTransaction.partialFee) - tipPlanck
          return new BalanceFormatter(val > 0n ? val : 0n, token.decimals, tokenRates)
        }
        case "evm-native": {
          if (!evmTransaction?.txDetails?.maxFee) return null
          const val =
            balance.transferable.planck - BigNumber.from(evmTransaction.txDetails.maxFee).toBigInt()
          return evmTransaction?.txDetails?.maxFee
            ? new BalanceFormatter(val > 0n ? val : 0n, token.decimals, tokenRates)
            : null
        }
        default:
          return new BalanceFormatter(
            balance.transferable.planck ?? "0",
            token.decimals,
            tokenRates
          )
      }
    } catch (err) {
      log.error("Failed to compute max amount", { err })
      return null
    }
  }, [
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
        feeTokenRates
      )
    }
    if (subTransaction?.partialFee) {
      return new BalanceFormatter(
        BigInt(subTransaction.partialFee),
        feeToken?.decimals,
        feeTokenRates
      )
    }
    return null
  }, [
    evmTransaction?.txDetails?.estimatedFee,
    feeToken?.decimals,
    feeTokenRates,
    subTransaction?.partialFee,
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

      const res = Object.entries(spend).map(([tokenId, amount]) => ({
        token: tokensMap[tokenId],
        cost: new BalanceFormatter(amount, tokensMap[tokenId].decimals, tokenRates),
        balance: new BalanceFormatter(
          balances.find({ tokenId }).sorted[0]?.transferable.planck,
          tokensMap[tokenId].decimals,
          tokenRatesMap[tokenId]
        ),
      }))

      return res
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
    tokenRatesMap,
    tokensMap,
    transfer,
  ])

  const tokensToBeReaped = useMemo(() => {
    return costBreakdown
      ?.map(({ token, cost, balance }) => {
        const remaining = balance.planck - cost.planck

        if (remaining === 0n || !isSubToken(token) || sendMax) return null

        const existentialDeposit = new BalanceFormatter(
          token.existentialDeposit ?? "0",
          token.decimals,
          tokenRatesMap[token.id]
        )

        return remaining < existentialDeposit.planck
          ? {
              token,
              existentialDeposit,
              amount: new BalanceFormatter(remaining, token.decimals, tokenRatesMap[token.id]),
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
  }, [costBreakdown, sendMax, tokenRatesMap])

  const { data: recipientBalance } = useRecipientBalance(token, to)

  const isSendingEnough = useIsSendingEnough(recipientBalance, token, transfer)

  const { isValid, error, errorDetails } = useMemo(() => {
    try {
      if (fromAccount?.origin === AccountTypes.WATCHED)
        return {
          isValid: false,
          error: t("Cannot send from a watched account"),
        }

      if (token && !isTransferableToken(token))
        return {
          isValid: false,
          error: t("{{symbol}} transfers are not supported at this time", { symbol: token.symbol }),
        }

      if (evmInvalidTxError) {
        return {
          isValid: false,
          error: t("Invalid input"),
          errorDetails: evmInvalidTxError.message,
        }
      }

      // some EVM networks will break on estimate fee if balance is insufficient, this simple check will prevent unfriendly error message
      if (token && balance && transfer && balance.transferable.planck < transfer.planck)
        return { isValid: false, error: t("Insufficient {{symbol}}", { symbol: token.symbol }) }

      const txError = evmTransaction?.error || subTransaction?.error
      if (txError)
        return {
          isValid: false,
          error: t("Failed to validate transaction"),
          errorDetails: (txError as Error)?.message ?? txError?.toString?.() ?? t("Unknown error"),
        }

      if (
        !from ||
        !to ||
        !(transfer || (sendMax && maxAmount)) ||
        !tokenId ||
        !costBreakdown ||
        !tokensToBeReaped ||
        !feeToken ||
        !feeTokenBalance ||
        !estimatedFee
      )
        return { isValid: false, error: undefined }

      // if paying fee makes the feeToken balance go below the existential deposit, then the transaction is invalid
      // https://github.com/paritytech/polkadot/issues/2485#issuecomment-782794995
      if (
        isSubToken(feeToken) &&
        feeToken.existentialDeposit &&
        feeTokenBalance.transferable.planck - estimatedFee.planck <
          BigInt(feeToken.existentialDeposit)
      )
        return {
          isValid: false,
          error: t("Insufficient {{symbol}} to pay for fees", { symbol: feeToken.symbol }),
        }

      for (const cost of costBreakdown)
        if (cost.balance.planck < cost.cost.planck)
          return {
            isValid: false,
            error: t("Insufficient {{symbol}}", { symbol: cost.token.symbol }),
          }

      if (!isSendingEnough && isSubToken(token)) {
        const ed = new BalanceFormatter(token.existentialDeposit, token.decimals)
        return {
          isValid: false,
          error: t("Please send a minimum of {{value}} {{symbol}}", {
            value: formatDecimals(ed.tokens),
            symbol: token.symbol,
          }),
        }
      }

      return { isValid: true, error: undefined }
    } catch (err) {
      log.error("checkIsValid", { err })
      return { isValid: true, error: t("Failed to validate") }
    }
  }, [
    balance,
    costBreakdown,
    evmInvalidTxError,
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
    feeToken,
    feeTokenBalance,
    estimatedFee,
    fromAccount?.origin,
    t,
  ])

  const isLoading = evmTransaction?.isLoading || subTransaction?.isLoading
  const isEstimatingMaxAmount = sendMax && !maxAmount

  const onSendMaxClick = useCallback(() => {
    if (!token || !maxAmount) return

    if (isSubToken(token)) set("sendMax", true)
    else set("amount", maxAmount.planck.toString())

    if (refTokensInput.current) {
      refTokensInput.current.value = maxAmount.tokens
      resizeTokensInput()
    }
    if (refFiatInput.current) {
      refFiatInput.current.value = maxAmount.fiat("usd")?.toString() ?? ""
      resizeFiatInput()
    }
  }, [maxAmount, resizeFiatInput, resizeTokensInput, set, token])

  const signMethod: SignMethod = useMemo(() => {
    if (!fromAccount || !token) return "unknown"
    if (fromAccount?.origin === AccountTypes.QR) {
      if (isSubToken(token)) return "qrSubstrate"
      else if (isEvmToken(token))
        return "unknown" // Parity signer / parity vault don't support ethereum accounts
      else throw new Error("Unknown token type")
    }
    if (fromAccount?.isHardware) {
      if (isSubToken(token)) return "hardwareSubstrate"
      else if (isEvmToken(token)) return "hardwareEthereum"
      else throw new Error("Unknown token type")
    }
    return "normal"
  }, [fromAccount, token])

  const [isProcessing, setIsProcessing] = useState(false)
  const [sendErrorMessage, setSendErrorMessage] = useState<string>()
  const send = useCallback(async () => {
    try {
      const value = sendMax ? maxAmount : transfer
      if (!from) throw new Error("Sender not found")
      if (!to) throw new Error("Recipient not found")
      if (!value) throw new Error("Amount not found")
      if (!token) throw new Error("Token not found")

      setIsProcessing(true)

      if (token.chain?.id && chain?.genesisHash) {
        const { hash } = await api.assetTransfer(
          token.chain.id,
          token.id,
          from,
          to,
          value.planck.toString(),
          tip?.planck.toString(),
          method
        )
        await sleep(500) // wait for dexie to pick up change in transactions table, prevents having "unfound transaction" flickering in progress screen
        gotoProgress({ hash, networkIdOrHash: chain.genesisHash })
      } else if (token.evmNetwork?.id) {
        if (!transfer) throw new Error("Missing send amount")
        if (!evmTransaction?.gasSettings) throw new Error("Missing gas settings")
        const { hash } = await api.assetTransferEth(
          token.evmNetwork.id,
          token.id,
          from,
          to,
          value.planck.toString(),
          evmTransaction.gasSettings
        )
        await sleep(500) // wait for dexie to pick up change in transactions table, prevents having "unfound transaction" flickering in progress screen
        gotoProgress({ hash, networkIdOrHash: token.evmNetwork?.id })
      } else throw new Error("Unknown network")
    } catch (err) {
      log.error("Failed to submit tx", { err })
      setSendErrorMessage((err as Error).message)
      setIsProcessing(false)
    }
  }, [
    chain,
    sendMax,
    maxAmount,
    transfer,
    from,
    to,
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
        if (subTransaction?.unsigned && token?.id && chain?.genesisHash) {
          const { hash } = await api.assetTransferApproveSign(subTransaction.unsigned, signature, {
            tokenId: token.id,
            value: amount,
            to,
          })
          await sleep(500) // wait for dexie to pick up change in transactions table, prevents having "unfound transaction" flickering in progress screen
          gotoProgress({ hash, networkIdOrHash: chain.genesisHash })
          return
        }
        if (evmTransaction?.transaction && amount && token?.evmNetwork?.id && to) {
          const { hash } = await api.assetTransferEthHardware(
            token?.evmNetwork.id,
            token.id,
            amount,
            to,
            evmTransaction.transaction,
            signature
          )
          await sleep(500) // wait for dexie to pick up change in transactions table, prevents having "unfound transaction" flickering in progress screen
          gotoProgress({ hash, networkIdOrHash: token.evmNetwork.id })
          return
        }
        throw new Error("Unknown transaction")
      } catch (err) {
        setSendErrorMessage((err as Error).message)
        setIsProcessing(false)
      }
    },
    [amount, evmTransaction, gotoProgress, subTransaction, to, token, chain]
  )

  // reset send error if route or params changes
  const location = useLocation()
  useEffect(() => {
    setSendErrorMessage(undefined)
  }, [location])

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
    errorDetails,
    isLocked,
    setIsLocked,
    isValid,
    tokensToBeReaped,
    send,
    sendWithSignature,
    signMethod,
    isProcessing,
    sendErrorMessage,
    isEstimatingMaxAmount,
    refTokensInput,
    resizeTokensInput,
    refFiatInput,
    resizeFiatInput,
  }
}

export const [SendFundsProvider, useSendFunds] = provideContext(useSendFundsProvider)
