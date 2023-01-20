import { provideContext } from "@talisman/util/provideContext"
import { BalanceFormatter } from "@talismn/balances"
import { useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { useEffect, useMemo } from "react"

const useSendFundsDetailsProvider = () => {
  const { from, amount, tokenId } = useSendFunds()
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const fromAccount = useAccountByAddress(from)

  const sendAmount = useMemo(
    () =>
      amount && token ? new BalanceFormatter(amount ?? "0", token.decimals, tokenRates) : null,
    [amount, token, tokenRates]
  )

  const chain = useChain(token?.chain?.id)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  const balances = useBalancesByAddress(from as string)

  const balance = useMemo(
    () => balances.find({ tokenId: tokenId ?? undefined }),
    [balances, tokenId]
  )

  const ctx = useMemo(
    () => ({
      token,
      tokenRates,
      sendAmount,
      fromAccount,
      chain,
      evmNetwork,
      balance,
    }),
    [balance, chain, evmNetwork, fromAccount, sendAmount, token, tokenRates]
  )

  // useEffect(() => {
  //   console.log("useSendFundsDetails", ctx)
  // }, [ctx])

  return ctx
}

export const [SendFundsDetailsProvider, useSendFundsDetails] = provideContext(
  useSendFundsDetailsProvider
)
