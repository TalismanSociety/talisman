import { Address, Balance, BalanceFormatter, BalanceTransferType } from "@talismn/balances"
import {
  isTokenDot,
  isTokenNeedExistentialDeposit,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import { formatDecimals, isNotNil } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { WalletTransactionInfo } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
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

import { SendFundsTransactionProps } from "./types"
import { useFeeToken } from "./useFeeToken"
import { useSendFundsTransactionDot } from "./useSendFundsTransactionDot"
import { useSendFundsTransactionEth } from "./useSendFundsTransactionEth"
import { useSendFundsTransactionSol } from "./useSendFundsTransactionSol"

const useSendFundsTransaction = () => {
  const { from, to, tokenId, amount, allowReap, sendMax } = useSendFundsWizard()
  const token = useToken(tokenId)

  const inputs = useMemo<SendFundsTransactionProps>(() => {
    return { tokenId, from, to, value: amount, sendMax, allowReap }
  }, [allowReap, amount, from, sendMax, to, tokenId])

  const txEth = useSendFundsTransactionEth(inputs)
  const txDot = useSendFundsTransactionDot(inputs)
  const txSol = useSendFundsTransactionSol(inputs)

  return useMemo(() => {
    switch (token?.platform) {
      case "polkadot":
        return txDot
      case "ethereum":
        return txEth
      case "solana":
        return txSol
      default:
        return null
    }
  }, [token?.platform, txDot, txEth, txSol])
}

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

  const method: BalanceTransferType = sendMax ? "all" : allowReap ? "allow-death" : "keep-alive"

  const transaction = useSendFundsTransaction()

  const transfer = useMemo(() => {
    if (!token) return null
    if (sendMax && isTokenDot(token))
      // substrate send max is dynamic
      return transaction?.maxAmount
        ? new BalanceFormatter(transaction.maxAmount, token.decimals, tokenRates)
        : null
    else if (amount) return new BalanceFormatter(amount, token.decimals, tokenRates)
    return null
  }, [amount, sendMax, token, tokenRates, transaction])

  const maxAmount = useMemo(
    () =>
      token && transaction?.maxAmount
        ? new BalanceFormatter(transaction?.maxAmount, token.decimals, tokenRates)
        : null,
    [transaction?.maxAmount, token, tokenRates],
  )

  const tip = useMemo(
    () =>
      transaction?.platform === "polkadot" && tipToken && transaction.tip
        ? new BalanceFormatter(transaction.tip, tipToken.decimals, tipTokenRates)
        : null,
    [tipToken, tipTokenRates, transaction],
  )

  const estimatedFee = useMemo(
    () =>
      feeToken && transaction?.estimatedFee
        ? new BalanceFormatter(transaction.estimatedFee, feeToken.decimals, feeTokenRates)
        : null,
    [feeToken, feeTokenRates, transaction?.estimatedFee],
  )

  const maxCostBreakdown = useMemo(() => {
    try {
      const transferAmount = sendMax ? transaction?.maxAmount : amount
      const maxFee =
        transaction?.platform === "ethereum" ? transaction.maxFee : transaction?.estimatedFee

      if (!token || !feeToken || !transferAmount || !maxFee) return null
      if (transaction?.platform === "polkadot" && transaction.isLoadingTip) return null

      const tip =
        transaction?.platform === "polkadot" && transaction.tip ? BigInt(transaction.tip) : 0n

      const spend: Record<TokenId, bigint> = {}
      spend[token.id] = BigInt(transferAmount)
      spend[feeToken.id] = (spend[feeToken.id] ?? 0n) + BigInt(maxFee)
      if (tip && tipToken) spend[tipToken.id] = (spend[tipToken.id] ?? 0n) + tip

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
    sendMax,
    amount,
    token,
    feeToken,
    transaction,
    tipToken,
    tokensMap,
    tokenRates,
    balances,
    tokenRatesMap,
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

      if (transaction?.error) {
        return {
          isValid: false,
          error:
            typeof transaction.error === "string" ? transaction.error : transaction.error.message,
        }
      }

      // some EVM networks will break on estimate fee if balance is insufficient, this simple check will prevent unfriendly error message
      if (token && transfer && (balance?.transferable.planck ?? 0n) < transfer.planck)
        return { isValid: false, error: t("Insufficient {{symbol}}", { symbol: token.symbol }) }

      if (
        feeToken &&
        transfer &&
        transaction?.estimatedFee &&
        (feeTokenBalance?.transferable.planck ?? 0n) < BigInt(transaction.estimatedFee)
      )
        return { isValid: false, error: t("Insufficient {{symbol}}", { symbol: feeToken.symbol }) }

      if (
        !transaction ||
        !from ||
        !to ||
        !(transfer || (sendMax && transaction.maxAmount)) ||
        !tokenId ||
        !maxCostBreakdown ||
        !tokensToBeReaped ||
        !feeToken ||
        !feeTokenBalance ||
        !transaction.estimatedFee ||
        (transaction?.platform === "polkadot" && transaction.isLoadingDryRun)
      )
        return { isValid: false, error: undefined }

      // if paying fee makes the feeToken balance go below the existential deposit, then the transaction is invalid
      // https://github.com/paritytech/polkadot/issues/2485#issuecomment-782794995
      if (
        isTokenNeedExistentialDeposit(feeToken) &&
        feeToken.existentialDeposit &&
        feeTokenBalance.transferable.planck - BigInt(transaction.estimatedFee) <
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

      if (
        transaction.platform === "polkadot" &&
        transaction.dryRun?.available &&
        !transaction.dryRun.ok
      )
        return {
          isValid: false,
          error: t("Transaction would fail: ") + transaction.dryRun.errorMessage,
        }

      if (transaction.error)
        return {
          isValid: false,
          error: t("Failed to validate transaction"),
          errorDetails:
            (transaction.error as Error)?.message ??
            transaction.error?.toString() ??
            t("Unknown error"),
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
    transaction,
    transfer,
    balance?.transferable.planck,
    feeToken,
    feeTokenBalance,
    from,
    to,
    sendMax,
    tokenId,
    maxCostBreakdown,
    tokensToBeReaped,
    isSendingEnough,
  ])

  const isLoading = transaction?.isLoading
  const isEstimatingMaxAmount = sendMax && !transaction?.maxAmount

  const onSendMaxClick = useCallback(() => {
    if (!token || !transaction?.maxAmount) return

    if (isTokenDot(token)) {
      set("amount", transaction.maxAmount) // amount is necessary for pallets that dont have a transfer_all method
      set("sendMax", true)
    } else set("amount", transaction.maxAmount)
  }, [transaction?.maxAmount, set, token])

  const onSubmitted = useCallback(
    (args: { networkId: string; txId: string }) => {
      gotoProgress(args)
    },
    [gotoProgress],
  )

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
    transaction,
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
