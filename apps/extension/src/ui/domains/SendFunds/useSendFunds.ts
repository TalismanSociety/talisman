import { AssetTransferMethod, SignerPayloadJSON } from "@extension/core"
import { roundToFirstInteger } from "@extension/core"
import { AccountType } from "@extension/core"
import {
  getEthTransferTransactionBase,
  serializeGasSettings,
  serializeTransactionRequest,
} from "@extension/core"
import { log } from "@extension/shared"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { Address, Balance, BalanceFormatter } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { formatDecimals, isEthereumAddress, sleep } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useBalancesHydrate } from "@ui/hooks/useBalancesHydrate"
import useChain from "@ui/hooks/useChain"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"
import useTokens from "@ui/hooks/useTokens"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { isTransferableToken } from "@ui/util/isTransferableToken"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"
import { TransactionRequest } from "viem"

import { useSubstratePayloadMetadata } from "../../hooks/useSubstratePayloadMetadata"
import { useEthTransaction } from "../Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "../Sign/Ethereum/riskAnalysis"
import { useFeeToken } from "./useFeeToken"
import { useSendFundsInputNumber } from "./useSendFundsInputNumber"
import { useSendFundsInputSize } from "./useSendFundsInputSize"

type SignMethod = "normal" | "hardwareSubstrate" | "hardwareEthereum" | "qrSubstrate" | "unknown"

const useRecipientBalance = (token?: Token | null, address?: Address | null) => {
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
  token?: Token | null,
  transfer?: BalanceFormatter | null
) => {
  return useMemo(() => {
    try {
      if (!token || !recipientBalance || !transfer) return true
      switch (token.type) {
        case "evm-uniswapv2":
        case "evm-erc20":
        case "evm-native":
          return true
        case "substrate-native":
        case "substrate-assets":
        case "substrate-tokens":
        case "substrate-psp22":
        case "substrate-equilibrium": {
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
  tokenId?: TokenId,
  from?: string,
  to?: string,
  planck?: string,
  isLocked?: boolean
) => {
  const token = useToken(tokenId)

  const [evmInvalidTxError, setEvmInvalidTxError] = useState<Error | undefined>()
  const [tx, setTx] = useState<TransactionRequest>()

  useEffect(() => {
    setEvmInvalidTxError(undefined)
    if (
      !isEvmToken(token) ||
      !token.evmNetwork?.id ||
      !token ||
      !planck ||
      !isEthereumAddress(from) ||
      !isEthereumAddress(to)
    )
      setTx(undefined)
    else {
      getEthTransferTransactionBase(token.evmNetwork.id, from, to, token, BigInt(planck))
        .then(setTx)
        .catch((err) => {
          setEvmInvalidTxError(err)
          setTx(undefined)
          // eslint-disable-next-line no-console
          console.error("Failed to populate transaction", { err })
        })
    }
  }, [from, to, token, planck])

  const result = useEthTransaction(tx, token?.evmNetwork?.id, isLocked, false)

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    evmNetworkId: token?.evmNetwork?.id,
    tx,
    disableAutoRiskScan: true,
  })

  return { evmTransaction: tx ? { tx, riskAnalysis, ...result } : undefined, evmInvalidTxError }
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

  const qPayloadMetadata = useSubstratePayloadMetadata(
    qSubstrateEstimateFee?.data?.unsigned ?? null
  )

  return useMemo(() => {
    if (!isSubToken(token)) return undefined

    const { partialFee, unsigned: unsignedOriginal } = qSubstrateEstimateFee.data ?? {}
    const {
      registry,
      txMetadata: shortMetadata,
      payloadWithMetadataHash,
    } = qPayloadMetadata.data ?? {}

    const isLoading = qSubstrateEstimateFee.isLoading || qPayloadMetadata.isLoading
    const isRefetching = qSubstrateEstimateFee.isRefetching || qPayloadMetadata.isRefetching
    const error = qSubstrateEstimateFee.error || qPayloadMetadata.error

    const unsigned = payloadWithMetadataHash ?? unsignedOriginal

    return { partialFee, unsigned, isLoading, isRefetching, error, registry, shortMetadata }
  }, [
    qPayloadMetadata.data,
    qPayloadMetadata.error,
    qPayloadMetadata.isLoading,
    qPayloadMetadata.isRefetching,
    qSubstrateEstimateFee.data,
    qSubstrateEstimateFee.error,
    qSubstrateEstimateFee.isLoading,
    qSubstrateEstimateFee.isRefetching,
    token,
  ])
}

export type ToWarning = "DIFFERENT_ACCOUNT_FORMAT" | "AZERO_ID" | undefined

const useSendFundsProvider = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, tokenId, amount, allowReap, sendMax, set, gotoProgress } = useSendFundsWizard()
  const [isLocked, setIsLocked] = useState(false)
  const [recipientWarning, setRecipientWarning] = useState<ToWarning>()

  const fromAccount = useAccountByAddress(from)
  const { tokensMap } = useTokens({ activeOnly: false, includeTestnets: true })
  const tokenRatesMap = useTokenRatesMap()
  const balances = useBalancesByAddress(from as string)
  const currency = useSelectedCurrency()
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
    ? "transferAllowDeath"
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
          const val = balance.transferable.planck - evmTransaction.txDetails.maxFee
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

  const [estimatedFee, maxFee] = useMemo(() => {
    if (evmTransaction?.txDetails?.estimatedFee) {
      return [
        new BalanceFormatter(
          evmTransaction.txDetails.estimatedFee,
          feeToken?.decimals,
          feeTokenRates
        ),
        new BalanceFormatter(evmTransaction.txDetails.maxFee, feeToken?.decimals, feeTokenRates),
      ]
    }
    if (subTransaction?.partialFee) {
      const fee = new BalanceFormatter(
        BigInt(subTransaction.partialFee),
        feeToken?.decimals,
        feeTokenRates
      )
      return [fee, fee]
    }
    return [null, null]
  }, [
    evmTransaction?.txDetails?.estimatedFee,
    evmTransaction?.txDetails?.maxFee,
    feeToken?.decimals,
    feeTokenRates,
    subTransaction?.partialFee,
  ])

  const maxCostBreakdown = useMemo(() => {
    try {
      const transferAmount = sendMax ? maxAmount : transfer
      if (!token || !feeToken || !transferAmount || !maxFee || (requiresTip && (!tip || !tipToken)))
        return null

      const spend: Record<TokenId, bigint> = {}
      spend[token.id] = transferAmount.planck
      spend[feeToken.id] = (spend[feeToken.id] ?? 0n) + maxFee.planck
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
    maxFee,
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
    return maxCostBreakdown
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
  }, [maxCostBreakdown, sendMax, tokenRatesMap])

  const { data: recipientBalance } = useRecipientBalance(token, to)

  const isSendingEnough = useIsSendingEnough(recipientBalance, token, transfer)

  const { isValid, error, errorDetails } = useMemo(() => {
    try {
      if (fromAccount?.origin === AccountType.Watched)
        return {
          isValid: false,
          error: t("Cannot send from a watched account"),
        }

      if (fromAccount?.origin === AccountType.Dcent)
        return {
          isValid: false,
          error: t("Cannot send from a D'CENT account"),
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

      if (
        !from ||
        !to ||
        !(transfer || (sendMax && maxAmount)) ||
        !tokenId ||
        !maxCostBreakdown ||
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
          BigInt(feeToken.existentialDeposit) &&
        !sendMax
      )
        return {
          isValid: false,
          error: t("Insufficient {{symbol}} to pay for fees", { symbol: feeToken.symbol }),
        }

      for (const cost of maxCostBreakdown)
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

      const txError = evmTransaction?.error || subTransaction?.error
      if (txError)
        return {
          isValid: false,
          error: t("Failed to validate transaction"),
          errorDetails: (txError as Error)?.message ?? txError?.toString?.() ?? t("Unknown error"),
        }

      return { isValid: true, error: undefined }
    } catch (err) {
      log.error("checkIsValid", { err })
      return { isValid: true, error: t("Failed to validate") }
    }
  }, [
    balance,
    maxCostBreakdown,
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
      refFiatInput.current.value = maxAmount.fiat(currency)?.toString() ?? ""
      resizeFiatInput()
    }
  }, [currency, maxAmount, resizeFiatInput, resizeTokensInput, set, token])

  const signMethod: SignMethod = useMemo(() => {
    if (!fromAccount || !token) return "unknown"
    if (fromAccount?.origin === AccountType.Qr) {
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

      api.analyticsCapture({
        eventName: "asset transfer fiat value",
        options: { value: roundToFirstInteger(value.fiat("usd") ?? 0) ?? "0" },
      })

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
        if (!isEthereumAddress(from)) throw new Error("Invalid sender address")
        if (!isEthereumAddress(to)) throw new Error("Invalid recipient address")
        const gasSettings = serializeGasSettings(evmTransaction.gasSettings)
        const { hash } = await api.assetTransferEth(
          token.evmNetwork.id,
          token.id,
          from,
          to,
          value.planck.toString(),
          gasSettings
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
    async (signature: HexString, payload?: SignerPayloadJSON) => {
      try {
        setIsProcessing(true)
        if (subTransaction?.unsigned && token?.id && chain?.genesisHash) {
          // if a payload is supplied, it means the transaction was signed by a hardware wallet and payload had to be modified to include metadata hash
          // otherwise, signature is for the initial payload
          const { hash } = await api.assetTransferApproveSign(
            payload || subTransaction.unsigned,
            signature,
            {
              tokenId: token.id,
              value: amount,
              to,
            }
          )
          await sleep(500) // wait for dexie to pick up change in transactions table, prevents having "unfound transaction" flickering in progress screen
          gotoProgress({ hash, networkIdOrHash: chain.genesisHash })
          return
        }
        if (
          evmTransaction?.transaction &&
          amount &&
          token?.evmNetwork?.id &&
          isEthereumAddress(to)
        ) {
          const serialized = serializeTransactionRequest(evmTransaction.transaction)
          const { hash } = await api.assetTransferEthHardware(
            token.evmNetwork.id,
            token.id,
            amount,
            to,
            serialized,
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
    recipientWarning,
    setRecipientWarning,
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
