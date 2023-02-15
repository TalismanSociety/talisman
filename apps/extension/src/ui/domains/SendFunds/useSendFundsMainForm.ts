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
  const { from, to, amount, tokenId } = useSendFundsWizard()
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

  const { requiresTip, tip: tipPlanck } = useTip(token?.chain?.id)
  const tipToken = useToken(chain?.nativeToken?.id)
  const tipTokenBalance = useBalance(from as string, tipToken?.id as string)

  const feeToken = useFeeToken(tokenId)
  const {
    data: dataEstimateFee,
    error: estimateFeeError,
    isFetching: isEstimatingFee,
  } = useSendFundsEstimateFee(from, from, tokenId, amount)
  const { estimatedFee, unsigned, pendingTransferId } = useMemo(() => {
    return dataEstimateFee ?? { estimatedFee: null, unsigned: null, pendingTransferId: null }
  }, [dataEstimateFee])
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

  const {
    data: recipientBalance,
    error: errorRecipientBalance,
    isFetched: isRecipientBalanceFetched,
  } = useRecipientBalance(token, to)

  const isSendingEnough = useMemo(() => {
    if (!token || !recipientBalance || !amount) return true
    switch (token.type) {
      case "evm-erc20":
      case "evm-native":
        return true
      case "substrate-native":
      case "substrate-orml":
      case "substrate-assets":
      case "substrate-equilibrium":
      case "substrate-tokens": {
        const transfer = new BalanceFormatter(amount, token.decimals)
        const existentialDeposit = new BalanceFormatter(
          token.existentialDeposit ?? "0",
          token.decimals
        )
        // console.log({
        //   transfer: transfer.tokens,
        //   recipientBalance: recipientBalance.total.tokens,
        //   existentialDeposit: existentialDeposit.tokens,
        // })

        return (
          transfer.planck === 0n ||
          recipientBalance.total.planck > 0n ||
          transfer.planck >= existentialDeposit.planck
        )
      }
    }
  }, [amount, recipientBalance, token])

  const { isValid, error } = useMemo(() => {
    if (!from || !to || !amount || !tokenId) return { isValid: false, error: undefined }

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

    return { isValid: true, error: undefined }
  }, [
    amount,
    chain,
    errorRecipientBalance,
    estimateFeeError,
    evmNetwork,
    feeToken,
    from,
    hasInsufficientFunds,
    isSendingEnough,
    to,
    token,
    tokenId,
  ])

  const tokensToBeReaped: Record<TokenId, bigint> = useMemo(() => {
    if (!token || !feeToken || !amount || !estimatedFee) return {}

    // for EVM checking hasInsufficientFunds is enough
    // for substrate, also check existential deposits on both sender and recipient accounts
    if (token.type === "substrate-native" || token.type === "substrate-orml") {
      const transfer = new BalanceFormatter(amount, token.decimals)
      const fee = new BalanceFormatter(estimatedFee, feeToken.decimals)
      const tip = new BalanceFormatter(requiresTip ? tipPlanck : "0", tipToken?.decimals)
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
      if (transfer.planck > BigInt("0"))
        spend[token.id] = (spend[token.id] ?? BigInt("0")) + transfer.planck
      if (fee.planck > BigInt("0"))
        spend[feeToken.id] = (spend[feeToken.id] ?? BigInt("0")) + fee.planck
      if (tipToken && tip.planck > BigInt("0"))
        spend[tipToken.id] = (spend[tipToken.id] ?? BigInt("0")) + tip.planck

      const result: Record<TokenId, bigint> = {}
      for (const [tokenId, value] of Object.entries(spend).filter(([id]) => tokenBalances[id]))
        if (tokenBalances[tokenId].transferable.planck < value + existentialDeposit.planck)
          result[tokenId] = tokenBalances[tokenId].transferable.planck - value
      return result
    }

    return {}
  }, [
    amount,
    balance,
    estimatedFee,
    feeToken,
    feeTokenBalance,
    requiresTip,
    tipPlanck,
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
      isEstimatingFee,
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
      isEstimatingFee,
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

  // useEffect(() => {
  //   log.log(ctx)
  // }, [ctx])

  return ctx
}

export const [SendFundsMainFormProvider, useSendFundsMainForm] = provideContext(
  useSendFundsMainFormProvider
)
