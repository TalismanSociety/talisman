import { log } from "@core/log"
import { provideContext } from "@talisman/util/provideContext"
import { Address, Balance, BalanceFormatter } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { formatDecimals } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import { useBalancesHydrate } from "@ui/hooks/useBalancesHydrate"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { isSubToken } from "@ui/util/isSubToken"
import { useEffect, useMemo } from "react"

import { useFeeToken } from "./useFeeToken"
import { useSendFunds } from "./useSendAmount"
import { useSendFundsEstimateFee } from "./useSendFundsEstimateFee"

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

const useSendFundsMainFormProvider = () => {
  const { from, to, tokenId, sendMax } = useSendFundsWizard()

  const {
    error: estimateFeeError,
    tokenRates,
    token,
    tip,
    balance,
    tipToken,
    tipTokenBalance,
    sendAmount,
    feeToken,
    isLoading,
    estimatedFee,
    feeTokenBalance,
    chain,
    evmNetwork,
  } = useSendFunds()

  const fromAccount = useAccountByAddress(from)

  const hasInsufficientFunds = useMemo(() => {
    if (sendAmount && balance && sendAmount.planck > balance.transferable.planck) return true
    if (
      estimatedFee &&
      feeTokenBalance &&
      estimatedFee.planck > feeTokenBalance.transferable.planck
    )
      return true
    // if token is also used to pay fee, ensure we can pay both transfer and fee
    if (
      balance &&
      feeTokenBalance &&
      balance.tokenId === feeTokenBalance.tokenId &&
      sendAmount &&
      estimatedFee &&
      sendAmount.planck + estimatedFee.planck > balance.transferable.planck
    )
      return true
    return false
  }, [balance, estimatedFee, feeTokenBalance, sendAmount])

  const {
    data: recipientBalance,
    error: errorRecipientBalance,
    isFetched: isRecipientBalanceFetched,
  } = useRecipientBalance(token, to)

  const isSendingEnough = useMemo(() => {
    if (!token || !recipientBalance || !sendAmount) return true
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
          sendAmount.planck === 0n ||
          recipientBalance.total.planck > 0n ||
          sendAmount.planck >= existentialDeposit.planck
        )
      }
    }
  }, [recipientBalance, sendAmount, token])

  const { isValid, error } = useMemo(() => {
    if (!from || !to || !sendAmount || !tokenId) return { isValid: false, error: undefined }

    if (hasInsufficientFunds) return { isValid: false, error: "Insufficient funds" }
    if (!token || !feeToken) return { isValid: false, error: "Token not found" }

    if (estimateFeeError) {
      return {
        isValid: false,
        error:
          //"Failed to estimate fees : " +
          ((estimateFeeError as any).reason ??
            (estimateFeeError as any).error?.message ??
            (estimateFeeError as Error).message) as string,
      }
    }

    switch (token.type) {
      case "evm-erc20":
      case "evm-native":
        if (!evmNetwork) return { isValid: false, error: "Network not found" }
        break
      case "substrate-native":
      case "substrate-orml":
        if (!chain) return { isValid: false, error: "Chain not found" }
        break
    }

    // TODO : do this only if recipient balance is below ED
    if (!isSendingEnough && isSubToken(token)) {
      const ed = new BalanceFormatter(token.existentialDeposit, token.decimals)
      return {
        isValid: false,
        error: `Please send a minimum of ${formatDecimals(ed.tokens)} ${token.symbol}`,
      }
    }

    // TODO warn only if amount is lower than ED
    if (errorRecipientBalance)
      return {
        isValid: true,
        error: "Could not fetch recipient balance. Proceed at your own risks.",
      }

    if (!estimatedFee) return { isValid: false, error: undefined }

    return { isValid: true, error: undefined }
  }, [
    chain,
    errorRecipientBalance,
    estimateFeeError,
    estimatedFee,
    evmNetwork,
    feeToken,
    from,
    hasInsufficientFunds,
    isSendingEnough,
    sendAmount,
    to,
    token,
    tokenId,
  ])

  const tokensToBeReaped: Record<TokenId, bigint> = useMemo(() => {
    if (!token || !feeToken || !sendAmount || !estimatedFee || sendMax) return {}

    // for EVM checking hasInsufficientFunds is enough
    // for substrate, also check existential deposits on both sender and recipient accounts
    if (isSubToken(token)) {
      //const fee = new BalanceFormatter(estimatedFee, feeToken.decimals)
      //const tip = new BalanceFormatter(requiresTip ? tipPlanck : "0", tipToken?.decimals)
      const existentialDeposit = new BalanceFormatter(
        token.existentialDeposit ?? "0",
        token.decimals
      )

      const tokenBalances = {
        [token.id]: balance,
        [feeToken.id]: feeTokenBalance,
      }
      if (tipToken) tokenBalances[tipToken.id] = tipTokenBalance

      const spend: Record<TokenId, bigint> = {}
      if (sendAmount.planck > BigInt("0"))
        spend[token.id] = (spend[token.id] ?? BigInt("0")) + sendAmount.planck
      if (estimatedFee.planck > BigInt("0"))
        spend[feeToken.id] = (spend[feeToken.id] ?? BigInt("0")) + estimatedFee.planck
      if (tip && tipToken && tip?.planck > BigInt("0"))
        spend[tipToken.id] = (spend[tipToken.id] ?? BigInt("0")) + tip.planck

      const result: Record<TokenId, bigint> = {}
      for (const [tokenId, value] of Object.entries(spend).filter(([id]) => tokenBalances[id]))
        if (tokenBalances[tokenId].transferable.planck < value + existentialDeposit.planck)
          result[tokenId] = tokenBalances[tokenId].transferable.planck - value
      return result
    }

    return {}
  }, [
    balance,
    estimatedFee,
    feeToken,
    feeTokenBalance,
    sendAmount,
    sendMax,
    tip,
    tipToken,
    tipTokenBalance,
    token,
  ])

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
      // estimateFeeError:  as Error,
      isEstimatingFee: isLoading,
      hasInsufficientFunds,
      isSendingEnough,
      tokensToBeReaped,
      isValid,
      error,
    }),
    [
      token,
      tokenRates,
      sendAmount,
      fromAccount,
      chain,
      evmNetwork,
      balance,
      feeToken,
      estimatedFee,
      isLoading,
      hasInsufficientFunds,
      isSendingEnough,
      tokensToBeReaped,
      isValid,
      error,
    ]
  )

  // useEffect(() => {
  //   log.log("SendFundsDetailsProvider", { estimateFeeError })
  // }, [estimateFeeError])

  useEffect(() => {
    log.log(ctx)
  }, [ctx])

  return ctx
}

export const [SendFundsMainFormProvider, useSendFundsMainForm] = provideContext(
  useSendFundsMainFormProvider
)
