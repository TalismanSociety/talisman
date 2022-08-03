import { Balance, BalanceFormatter, BalanceStorage, Balances } from "@core/domains/balances/types"
import { Chain } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { Token } from "@core/domains/tokens/types"
import { tokensToPlanck } from "@core/util/tokensToPlanck"
import { assert } from "@polkadot/util"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useBalances from "@ui/hooks/useBalances"
import useChains from "@ui/hooks/useChains"
import { chainUsesOrmlForNativeToken } from "@ui/hooks/useChainsTokens"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useTokens from "@ui/hooks/useTokens"
import { useCallback, useEffect, useMemo, useState } from "react"

import { SendTokensExpectedResult, SendTokensInputs, TokenAmountInfo } from "./types"
import { useTransferableTokens } from "./useTransferableTokens"

type Props = {
  initialValues?: Partial<SendTokensInputs>
}

const useSendTokensProvider = ({ initialValues }: Props) => {
  // define only the state that is useful to be shared between the different screens of the wizard
  // keep everything else locally in each screen component
  const [formData, setFormData] = useState<Partial<SendTokensInputs>>(initialValues ?? {})
  const [expectedResult, setExpectedResult] = useState<SendTokensExpectedResult>()
  const [hasAcceptedForfeit, setHasAcceptedForfeit] = useState(false)
  const [transactionId, setTransactionId] = useState<string>()

  const transferableTokens = useTransferableTokens()
  const transferableToken = useMemo(
    () => transferableTokens?.find((tt) => tt.id === formData.transferableTokenId),
    [formData.transferableTokenId, transferableTokens]
  )

  // there must always be a token
  useEffect(() => {
    if (formData.transferableTokenId === undefined && transferableTokens.length > 0)
      setFormData({ transferableTokenId: transferableTokens[0].id })
  }, [formData.transferableTokenId, transferableTokens])

  const evmNetworks = useEvmNetworks()
  const chains = useChains()
  const tokens = useTokens()
  // const chainsMap = useMemo(
  //   () => Object.fromEntries((chains || []).map((chain) => [chain.id, chain])),
  //   [chains]
  // )
  const tokensMap = useMemo(
    () => Object.fromEntries((tokens || []).map((token) => [token.id, token])),
    [tokens]
  )

  // nonEmptyBalances is needed in order to detect chains who use the orml pallet for their native token
  const balances = useBalances()
  const nonEmptyBalances = useMemo(
    () =>
      balances ? balances.find((balance) => balance.free.planck > BigInt("0")) : new Balances([]),
    [balances]
  )

  const check = useCallback(
    async (newData: SendTokensInputs, allowReap = false) => {
      const { amount, transferableTokenId, from, to, tip } = newData

      const transferableToken = transferableTokens.find((tt) => tt.id === transferableTokenId)
      if (!transferableToken) throw new Error("Transferable token not found")
      const { token, chainId, evmNetworkId } = transferableToken
      if (!token) throw new Error("Token not found")

      const chain: Chain | null = (!!chainId && chains?.find((c) => c.id === chainId)) || null
      const evmNetwork =
        (!!evmNetworkId && evmNetworks?.find((n) => Number(n.id) === Number(evmNetworkId))) || null
      if (!chain && !evmNetwork) throw new Error("Network not found")

      const network = (chain || evmNetwork) as Chain | EvmNetwork
      const isEvm = !!evmNetwork
      const nativeToken = network.nativeToken ? tokensMap[network.nativeToken.id] : token
      const tokenIsNativeToken = token.id === network.nativeToken?.id

      // load all balances at once
      const newBalance = (promise: Promise<BalanceStorage>) =>
        promise.then((storage) => new Balance(storage))

      const networkFilter = chain ? { chainId } : { evmNetworkId }

      const balances = await Promise.all([
        newBalance(api.getBalance({ ...networkFilter, tokenId: token.id, address: from })),
        newBalance(api.getBalance({ ...networkFilter, tokenId: token.id, address: to })),

        // get nativeToken balance for fee calculation if token transfer is not native
        !tokenIsNativeToken &&
          network.nativeToken?.id &&
          newBalance(api.getBalance({ chainId, tokenId: network.nativeToken?.id, address: from })),
      ])
      const [fromBalance, toBalance, _nativeFromBalance] = balances
      const nativeFromBalance = _nativeFromBalance || fromBalance

      const transfer: TokenAmountInfo = {
        symbol: token.symbol,
        decimals: token.decimals,
        existentialDeposit: new BalanceFormatter(
          ("existentialDeposit" in token ? token.existentialDeposit : "0") ?? "0",
          token.decimals,
          token.rates
        ),
        amount: new BalanceFormatter(
          tokensToPlanck(amount, token.decimals),
          token.decimals,
          token.rates
        ),
      }

      // check recipient's balance, prevent immediate reaping
      if (toBalance.total.planck === BigInt("0")) {
        assert(
          transfer.amount.planck >= transfer.existentialDeposit.planck,
          `Please send at least ${transfer.existentialDeposit.tokens} ${transfer.symbol} to ensure the receiving address remains active.`
        )
      }

      // checks stop here for EVM
      if (!chainId) {
        setFormData((prev) => ({
          ...prev,
          ...newData,
        }))
        // TODO ....
        setExpectedResult({
          type: "evm",
          transfer,
        })
        return
      }

      const { partialFee, unsigned, pendingTransferId } = await api.assetTransferCheckFees(
        chainId,
        token.id,
        from,
        to,
        transfer.amount.planck.toString(),
        tip,
        allowReap
      )

      const fees: TokenAmountInfo = {
        symbol: nativeToken.symbol,
        decimals: nativeToken.decimals,
        existentialDeposit: new BalanceFormatter(
          ("existentialDeposit" in nativeToken ? nativeToken.existentialDeposit : "0") ?? "0",
          nativeToken.decimals,
          nativeToken.rates
        ),
        amount: new BalanceFormatter(
          BigInt(partialFee) + BigInt(tip),
          nativeToken.decimals,
          nativeToken.rates
        ),
      }

      // for each currency involved, check if sufficient balance and if it will cause account to be reaped
      const forfeits: TokenAmountInfo[] = []
      const testToken = (token: Token, balance: Balance, cost: BalanceFormatter) => {
        // sufficient balance?
        if (balance.transferable.planck < cost.planck)
          throw new Error(`Insufficient balance (${token.symbol})`)

        // existential deposit?
        const remaining = balance.total.planck - cost.planck
        if (
          remaining <
          BigInt(("existentialDeposit" in token ? token.existentialDeposit : "0") ?? "0")
        )
          forfeits.push({
            symbol: token.symbol,
            decimals: token.decimals,
            existentialDeposit: new BalanceFormatter(
              ("existentialDeposit" in token ? token.existentialDeposit : "0") ?? "0",
              token.decimals,
              token.rates
            ),
            amount: new BalanceFormatter(remaining, token.decimals, token.rates),
          })
      }

      const nativeTokenIsOrmlToken =
        token.chain?.id !== undefined &&
        chainUsesOrmlForNativeToken(nonEmptyBalances, token.chain?.id, nativeToken)

      if (
        token.id === nativeToken.id ||
        (nativeTokenIsOrmlToken && token.symbol === nativeToken.symbol)
      ) {
        // fees and transfer on token (which is also nativeToken)
        testToken(
          token,
          fromBalance,
          new BalanceFormatter(
            transfer.amount.planck + fees.amount.planck,
            token.decimals,
            token.rates
          )
        )
      } else {
        // fees on nativeToken
        testToken(nativeToken, nativeFromBalance, fees.amount)
        // transfer on token
        testToken(token, fromBalance, transfer.amount)
      }

      setFormData((prev) => ({
        ...prev,
        ...newData,
      }))
      setExpectedResult({
        type: "substrate",
        transfer,
        fees,
        forfeits,
        pendingTransferId: pendingTransferId,
        unsigned,
      })
    },
    [chains, evmNetworks, nonEmptyBalances, tokensMap, transferableTokens]
  )

  // this makes user return to the first screen of the wizard
  const cancel = useCallback(() => {
    setExpectedResult(undefined)
    setHasAcceptedForfeit(false)
  }, [])

  // execute the TX
  const send = useCallback(async () => {
    const { amount, transferableTokenId, from, to, tip } = formData as SendTokensInputs

    const transferableToken = transferableTokens.find((tt) => tt.id === transferableTokenId)
    if (!transferableToken) throw new Error("Transferable token not found")
    const { token, chainId, evmNetworkId } = transferableToken
    if (!token) throw new Error("Token not found")
    // TODO: Support evm tokens who have an evmNetwork instead of a chainId
    // const chainId = token.chain?.id
    // if (!chainId) throw new Error("Chain not found")
    // const chain = chainsMap[chainId]
    // if (!chain) throw new Error("Chain not found")
    if (!chainId && !evmNetworkId) throw new Error("chain not found")

    if (chainId) {
      const { id } = await api.assetTransfer(
        chainId,
        token.id,
        from,
        to,
        tokensToPlanck(amount, token.decimals),
        tip,
        hasAcceptedForfeit
      )
      setTransactionId(id)
    } else if (evmNetworkId) {
      const { id } = await api.assetTransferEth(
        evmNetworkId,
        token.id,
        from,
        to,
        tokensToPlanck(amount, token.decimals),
        tip,
        hasAcceptedForfeit
      )
      setTransactionId(id)
    } else throw new Error("Network not found")
  }, [formData, hasAcceptedForfeit, transferableTokens])

  // execute the TX
  const sendWithSignature = useCallback(
    async (signature: `0x${string}` | Uint8Array) => {
      if (expectedResult?.type !== "substrate") throw new Error("Review data not found")
      const { pendingTransferId } = expectedResult
      if (!pendingTransferId) throw new Error("Pending transaction not found")
      const { id } = await api.assetTransferApproveSign(pendingTransferId, signature)
      setTransactionId(id)
    },
    [expectedResult]
  )

  // required to access review screen if an amount is to be forfeited
  const acceptForfeit = useCallback(async () => {
    // if hardware account, need to get a pending transaction that uses transfer (non-keep-alive)
    await check(formData as SendTokensInputs, true)
    setHasAcceptedForfeit(true)
  }, [check, formData])

  // components visibility
  const { showForm, showConfirmReap, showReview, showTransaction } = useMemo(
    () => ({
      showForm: Boolean(
        !expectedResult ||
          (expectedResult.type === "substrate" &&
            expectedResult.forfeits.length &&
            !hasAcceptedForfeit)
      ),
      showConfirmReap: Boolean(
        expectedResult?.type === "substrate" &&
          expectedResult.forfeits.length &&
          !hasAcceptedForfeit
      ),
      showReview: Boolean(
        expectedResult &&
          (expectedResult.type !== "substrate" ||
            !expectedResult.forfeits.length ||
            hasAcceptedForfeit) &&
          !transactionId
      ),
      showTransaction: Boolean(transactionId),
    }),
    [expectedResult, hasAcceptedForfeit, transactionId]
  )

  const context = {
    formData,
    expectedResult,
    check,
    cancel,
    send,
    acceptForfeit,
    transactionId,
    hasAcceptedForfeit,
    showForm,
    showConfirmReap,
    showReview,
    showTransaction,
    sendWithSignature,
    transferableTokens,
    transferableToken,
  }

  //console.log("SendForm.context", context)

  return context
}

export const [SendTokensProvider, useSendTokens] = provideContext(useSendTokensProvider)
