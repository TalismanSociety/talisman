import {
  Address,
  Balance,
  BALANCE_MODULES,
  BalanceFormatter,
  BalanceTransferType,
} from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import {
  isTokenDot,
  isTokenEth,
  isTokenNeedExistentialDeposit,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { formatDecimals, isNotNil } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { getEthTransferTransactionBase, WalletTransactionInfo } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { TransactionRequest } from "viem"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useSubstrateDryRun } from "@ui/hooks/useSubstrateDryRun"
import { useTip } from "@ui/hooks/useTip"
import {
  useAccountByAddress,
  useBalance,
  useBalancesByAddress,
  useBalancesHydrate,
  useNetworkById,
  useToken,
  useTokenRates,
  useTokenRatesMap,
  useTokensMap,
} from "@ui/state"
import { isTransferableToken } from "@ui/util/isTransferableToken"

import { useSubstratePayloadMetadata } from "../../hooks/useSubstratePayloadMetadata"
import { useEthTransaction } from "../Ethereum/useEthTransaction"
import { useEvmTransactionRiskAnalysis } from "../Sign/Ethereum/riskAnalysis"
import { useFeeToken } from "./useFeeToken"

const useRecipientBalance = (token?: Token | null, address?: Address | null) => {
  const { t } = useTranslation()
  const hydrate = useBalancesHydrate()

  return useQuery({
    queryKey: [token?.id, address, hydrate],
    queryFn: async () => {
      if (!token || !address || !hydrate) return null
      const storage = await api.getBalance({
        address,
        tokenId: token.id,
      })
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
  transfer?: BalanceFormatter | null,
) => {
  return useMemo(() => {
    try {
      if (!token || !recipientBalance || !transfer) return true

      if (!isTokenNeedExistentialDeposit(token)) return true

      const existentialDeposit = new BalanceFormatter(
        token.existentialDeposit ?? "0",
        token.decimals,
      )

      return (
        transfer.planck === 0n ||
        recipientBalance.total.planck > 0n ||
        transfer.planck >= existentialDeposit.planck
      )
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
  isLocked?: boolean,
) => {
  const token = useToken(tokenId)

  const [evmInvalidTxError, setEvmInvalidTxError] = useState<Error | undefined>()
  const [tx, setTx] = useState<TransactionRequest>()

  useEffect(() => {
    setEvmInvalidTxError(undefined)
    if (
      !isTokenEth(token) ||
      !token.networkId ||
      !token ||
      !planck ||
      !from ||
      !to ||
      !isEthereumAddress(from) ||
      !isEthereumAddress(to)
    )
      setTx(undefined)
    else {
      getEthTransferTransactionBase(token.networkId, from, to, token, BigInt(planck))
        .then(setTx)
        .catch((err) => {
          setEvmInvalidTxError(err)
          setTx(undefined)
          // eslint-disable-next-line no-console
          console.error("Failed to populate transaction", { err })
        })
    }
  }, [from, to, token, planck])

  const result = useEthTransaction(tx, token?.networkId, isLocked, false)

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    evmNetworkId: token?.networkId,
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
  method?: BalanceTransferType,
  isLocked?: boolean,
) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  const qSapi = useScaleApi(token?.networkId)

  const qPayload = useQuery({
    queryKey: ["callData", token?.id, from, to, amount, qSapi?.data?.id, method],
    queryFn: async () => {
      if (
        !token?.networkId ||
        network?.platform !== "polkadot" ||
        !from ||
        !to ||
        !amount ||
        !qSapi?.data ||
        !method
      )
        return null

      const { data: sapi } = qSapi

      const mod = BALANCE_MODULES.find((mod) => mod.type === token.type)
      if (mod?.platform !== "polkadot") throw new Error(`Unsupported module type: ${mod?.type}`)

      const callData = await mod.getTransferCallData({
        from,
        to,
        value: amount,
        token,
        metadataRpc: sapi.chain.metadataRpc,
        // ChainConnector is not available on front end.
        // getTransferCallData only uses the send method so we can mimic it safely
        connector: { send: api.subSend } as unknown as ChainConnector,
        type: method,
        config: network.balancesConfig?.[mod.type],
      })

      const decodedCall = sapi.getDecodedCallFromPayload(callData)

      return sapi.getExtrinsicPayload(decodedCall.pallet, decodedCall.method, decodedCall.args, {
        address: from,
        tip: tip ? BigInt(tip) : 0n,
      })
    },
    refetchInterval: false,
    enabled: !isLocked,
  })

  const qSubstrateEstimateFee = useQuery({
    queryKey: ["estimateFee", qSapi?.data?.id, qPayload?.data?.payload],
    queryFn: async () => {
      if (!qSapi?.data || !qPayload?.data?.payload) return null

      const sapi = qSapi.data
      const payload = qPayload.data.payload

      const fee = await sapi.getFeeEstimate(payload)

      return { partialFee: fee.toString(), unsigned: payload }
    },
    refetchInterval: false,
    enabled: !isLocked,
  })

  const qPayloadMetadata = useSubstratePayloadMetadata(
    qSubstrateEstimateFee?.data?.unsigned ?? null,
  )

  return useMemo(() => {
    if (!isTokenDot(token)) return undefined

    const { partialFee, unsigned: unsignedOriginal } = qSubstrateEstimateFee.data ?? {}
    const {
      registry,
      txMetadata: shortMetadata,
      payloadWithMetadataHash,
    } = qPayloadMetadata.data ?? {}

    const queries = [qSapi, qPayload, qSubstrateEstimateFee, qPayloadMetadata]

    const isLoading = queries.some((q) => q.isLoading)
    const isRefetching = queries.some((q) => q.isRefetching)
    const error = queries.map((q) => q.error).find((err) => !!err)

    const unsigned = payloadWithMetadataHash ?? unsignedOriginal

    return {
      partialFee,
      unsigned,
      isLoading,
      isRefetching,
      error,
      registry,
      shortMetadata,
      sapi: qSapi.data,
    }
  }, [qPayload, qPayloadMetadata, qSapi, qSubstrateEstimateFee, token])
}

export type ToWarning = "AZERO_ID" | undefined

const useSendFundsProvider = () => {
  const { t } = useTranslation()
  const { from, to, tokenId, amount, allowReap, sendMax, set, gotoProgress } = useSendFundsWizard()
  const [isLocked, setIsLocked] = useState(false)
  const [recipientWarning, setRecipientWarning] = useState<ToWarning>()

  const fromAccount = useAccountByAddress(from)
  const tokensMap = useTokensMap()
  const tokenRatesMap = useTokenRatesMap()
  const balances = useBalancesByAddress(from as string)
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)
  const balance = useBalance(from as string, tokenId as string)
  const network = useNetworkById(token?.networkId)
  const tipToken = useToken(network?.nativeTokenId)
  const tipTokenRates = useTokenRates(network?.nativeTokenId)
  const tipTokenBalance = useBalance(from as string, tipToken?.id as string)
  const feeToken = useFeeToken(tokenId)
  const feeTokenBalance = useBalance(from as string, feeToken?.id as string)
  const feeTokenRates = useTokenRates(feeToken?.id)

  const transfer = useMemo(
    () => (token && amount ? new BalanceFormatter(amount, token.decimals, tokenRates) : null),
    [amount, token, tokenRates],
  )

  const { requiresTip, tip: tipPlanck } = useTip(token?.networkId, !isLocked)
  const tip = useMemo(
    () => (tipPlanck ? new BalanceFormatter(tipPlanck, tipToken?.decimals, tipTokenRates) : null),
    [tipPlanck, tipToken?.decimals, tipTokenRates],
  )

  const method: BalanceTransferType = sendMax ? "all" : allowReap ? "allow-death" : "keep-alive"

  const { evmTransaction, evmInvalidTxError } = useEvmTransaction(
    tokenId,
    from,
    to,
    amount ?? "0",
    isLocked,
  )
  const subTransaction = useSubTransaction(
    tokenId,
    from,
    to,
    amount ?? "0",
    tip?.planck.toString(),
    method,
    isLocked,
  )

  const maxAmount = useMemo(() => {
    if (!balance || !token) return null

    try {
      const tipPlanck = tipToken?.id === token.id ? (tip?.planck ?? 0n) : 0n

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
            tokenRates,
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
          feeTokenRates,
        ),
        new BalanceFormatter(evmTransaction.txDetails.maxFee, feeToken?.decimals, feeTokenRates),
      ]
    }
    if (subTransaction?.partialFee) {
      const fee = new BalanceFormatter(
        BigInt(subTransaction.partialFee),
        feeToken?.decimals,
        feeTokenRates,
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
          tokenRatesMap[tokenId],
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

        if (remaining === 0n || !isTokenNeedExistentialDeposit(token) || sendMax) return null

        const existentialDeposit = new BalanceFormatter(
          token.existentialDeposit ?? "0",
          token.decimals,
          tokenRatesMap[token.id],
        )

        return remaining < existentialDeposit.planck
          ? {
              token,
              existentialDeposit,
              amount: new BalanceFormatter(remaining, token.decimals, tokenRatesMap[token.id]),
            }
          : null
      })
      .filter(isNotNil) as
      | {
          token: Token
          existentialDeposit: BalanceFormatter
          amount: BalanceFormatter
        }[]
      | undefined
  }, [maxCostBreakdown, sendMax, tokenRatesMap])

  const { data: recipientBalance } = useRecipientBalance(token, to)

  const isSendingEnough = useIsSendingEnough(recipientBalance, token, transfer)

  const { data: dryRun, isLoading: isLoadingDryRun } = useSubstrateDryRun(subTransaction?.unsigned)

  const { isValid, error, errorDetails } = useMemo(() => {
    try {
      if (fromAccount?.type === "watch-only")
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
      if (token && transfer && (balance?.transferable.planck ?? 0n) < transfer.planck)
        return { isValid: false, error: t("Insufficient {{symbol}}", { symbol: token.symbol }) }

      if (
        feeToken &&
        transfer &&
        estimatedFee?.planck &&
        (feeTokenBalance?.transferable.planck ?? 0n) < estimatedFee.planck
      )
        return { isValid: false, error: t("Insufficient {{symbol}}", { symbol: feeToken.symbol }) }

      if (
        !from ||
        !to ||
        !(transfer || (sendMax && maxAmount)) ||
        !tokenId ||
        !maxCostBreakdown ||
        !tokensToBeReaped ||
        !feeToken ||
        !feeTokenBalance ||
        !estimatedFee ||
        isLoadingDryRun
      )
        return { isValid: false, error: undefined }

      // if paying fee makes the feeToken balance go below the existential deposit, then the transaction is invalid
      // https://github.com/paritytech/polkadot/issues/2485#issuecomment-782794995
      if (
        isTokenNeedExistentialDeposit(feeToken) &&
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

      if (!isSendingEnough && token && isTokenNeedExistentialDeposit(token)) {
        const ed = new BalanceFormatter(token.existentialDeposit, token.decimals)
        return {
          isValid: false,
          error: t("Please send a minimum of {{value}} {{symbol}}", {
            value: formatDecimals(ed.tokens),
            symbol: token.symbol,
          }),
        }
      }

      if (dryRun?.available && !dryRun.ok)
        return {
          isValid: false,
          error: t("Transaction would fail: ") + dryRun.errorMessage,
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
    fromAccount?.type,
    t,
    token,
    evmInvalidTxError,
    transfer,
    balance?.transferable.planck,
    feeToken,
    estimatedFee,
    feeTokenBalance,
    from,
    to,
    sendMax,
    maxAmount,
    tokenId,
    maxCostBreakdown,
    tokensToBeReaped,
    isSendingEnough,
    dryRun,
    evmTransaction?.error,
    subTransaction?.error,
    isLoadingDryRun,
  ])

  const isLoading = evmTransaction?.isLoading || subTransaction?.isLoading || isLoadingDryRun
  const isEstimatingMaxAmount = sendMax && !maxAmount

  const onSendMaxClick = useCallback(() => {
    if (!token || !maxAmount) return

    if (isTokenDot(token)) set("sendMax", true)
    else set("amount", maxAmount.planck.toString())
  }, [maxAmount, set, token])

  const onSubmitted = useCallback(
    (args: { hash: `0x${string}`; networkIdOrHash: string }) => {
      gotoProgress(args)
    },
    [gotoProgress],
  )

  useEffect(() => {
    if (dryRun) log.debug("Dry run result", dryRun)
  }, [dryRun])

  const txInfo = useMemo<WalletTransactionInfo | null>(() => {
    if (!tokenId || !from || !to || !transfer) return null

    return {
      type: "transfer",
      to,
      tokenId,
      value: transfer.planck.toString(),
    }
  }, [from, to, tokenId, transfer])

  return {
    from,
    to,
    tokenId,
    amount,
    txInfo,
    transfer,
    sendMax,
    allowReap,
    onSendMaxClick,
    network,
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
    isEstimatingMaxAmount,
    onSubmitted,
  }
}

export const [SendFundsProvider, useSendFunds] = provideContext(useSendFundsProvider)
