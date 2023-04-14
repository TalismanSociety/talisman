import {
  DEFAULT_SEND_FUNDS_TOKEN_ETHEREUM,
  DEFAULT_SEND_FUNDS_TOKEN_SUBSTRATE,
} from "@core/constants"
import { Balance, BalanceFormatter, BalanceJson, Balances } from "@core/domains/balances/types"
import { Chain, ChainId } from "@core/domains/chains/types"
import { EvmNetwork } from "@core/domains/ethereum/types"
import { Token } from "@core/domains/tokens/types"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { HexString } from "@polkadot/util/types"
import * as Sentry from "@sentry/browser"
import { provideContext } from "@talisman/util/provideContext"
import { tokensToPlanck } from "@talismn/util"
import { api } from "@ui/api"
import { getExtensionEthereumProvider } from "@ui/domains/Ethereum/getExtensionEthereumProvider"
import useAccounts from "@ui/hooks/useAccounts"
import useBalances from "@ui/hooks/useBalances"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { BigNumber, ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  SendTokensData,
  SendTokensExpectedResult,
  SendTokensInputs,
  TokenAmountInfo,
} from "./types"
import { useTransferableTokens } from "./useTransferableTokens"

type Props = {
  initialValues?: Partial<SendTokensInputs>
}

// Acala uses the balances pallet for its nativeToken.
// Kintsugi uses the orml pallet for its nativeToken.
//
// To automatically determine which is in use, for the nativeToken we will:
//  - Default to using the balances pallet, disable the orml pallet.
//  - Check if any accounts have a non-zero balance on the orml pallet.
//  - If so, disable the balances pallet and enable the orml pallet.
function chainUsesOrmlForNativeToken(
  nonEmptyBalances: Balances,
  chainId: ChainId,
  nativeToken: Token
): boolean {
  return (
    nonEmptyBalances
      .find({ chainId, source: "substrate-orml" })
      .find((balance) => balance.token?.symbol === nativeToken.symbol).count > 0
  )
}

const checkInitialFormData = (
  initialValues: Partial<SendTokensInputs> = {}
): Partial<SendTokensInputs> => {
  return {
    ...initialValues,
    transferableTokenId:
      initialValues.transferableTokenId ??
      (isEthereumAddress(initialValues.from)
        ? DEFAULT_SEND_FUNDS_TOKEN_ETHEREUM
        : DEFAULT_SEND_FUNDS_TOKEN_SUBSTRATE),
  }
}

const useSendTokensProvider = ({ initialValues }: Props) => {
  // define only the state that is useful to be shared between the different screens of the wizard
  // keep everything else locally in each screen component
  const [formData, setFormData] = useState<Partial<SendTokensData>>(
    checkInitialFormData(initialValues)
  )
  const [expectedResult, setExpectedResult] = useState<SendTokensExpectedResult>()
  const [hasAcceptedForfeit, setHasAcceptedForfeit] = useState(false)
  const [transactionHash, setTransactionHash] = useState<HexString>()

  const accounts = useAccounts()
  const [useTestnets] = useSetting("useTestnets")
  const transferableTokens = useTransferableTokens()
  const { evmNetworksMap } = useEvmNetworks(useTestnets)
  const { chainsMap } = useChains(useTestnets)
  const { tokensMap } = useTokens(useTestnets)

  const transferableTokensMap = useMemo(
    () => Object.fromEntries((transferableTokens || []).map((tt) => [tt.id, tt])),
    [transferableTokens]
  )

  const transferableToken = useMemo(
    () => transferableTokens?.find((tt) => tt.id === formData.transferableTokenId),
    [formData.transferableTokenId, transferableTokens]
  )

  // there must always be a token
  useEffect(() => {
    if (formData.transferableTokenId !== undefined || !transferableTokens.length) return

    // all transferable tokens may not be loaded yet, hardcode ids
    let transferableTokenId = transferableTokens[0].id
    if (formData.from) {
      if (isEthereumAddress(formData.from)) transferableTokenId = DEFAULT_SEND_FUNDS_TOKEN_ETHEREUM
      else transferableTokenId = DEFAULT_SEND_FUNDS_TOKEN_SUBSTRATE
    }
    setFormData(({ from }) => ({ from, transferableTokenId }))
  }, [formData.from, formData.transferableTokenId, transferableTokens])

  // nonEmptyBalances is needed in order to detect chains who use the substrate-orml source for their native token
  const balances = useBalances()
  const nonEmptyBalances = useMemo(
    () => (balances ? balances.find((balance) => balance.free.planck > 0n) : new Balances([])),
    [balances]
  )

  const check = useCallback(
    async (newData: SendTokensData, allowReap = false) => {
      const { amount, transferableTokenId, from, to, tip, gasSettings } = newData

      const transferableToken = transferableTokensMap[transferableTokenId]
      if (!transferableToken) throw new Error("Transferable token not found")
      const { token, chainId, evmNetworkId } = transferableToken
      if (!token) throw new Error("Token not found")

      const chain = (!!chainId && chainsMap[chainId]) || null
      const evmNetwork = (!!evmNetworkId && evmNetworksMap[evmNetworkId]) || null
      if (!chain && !evmNetwork) throw new Error("Network not found")

      const network = (chain || evmNetwork) as Chain | EvmNetwork
      const nativeToken = network.nativeToken ? tokensMap[network.nativeToken.id] : token
      const tokenIsNativeToken = token.id === network.nativeToken?.id

      // load all balances at once
      const loadBalance = (promise: Promise<BalanceJson | undefined>) =>
        promise.then((storage) => (storage ? new Balance(storage) : undefined))

      const networkFilter = chain ? { chainId } : { evmNetworkId }

      const balances = await Promise.all([
        loadBalance(api.getBalance({ ...networkFilter, tokenId: token.id, address: from })),
        loadBalance(api.getBalance({ ...networkFilter, tokenId: token.id, address: to })),

        // get nativeToken balance for fee calculation if token transfer is not native
        !tokenIsNativeToken &&
          network.nativeToken?.id &&
          loadBalance(
            api.getBalance({ ...networkFilter, tokenId: network.nativeToken?.id, address: from })
          ),
      ])
      const [fromBalance, toBalance, _nativeFromBalance] = balances
      const nativeFromBalance = _nativeFromBalance || fromBalance

      const transfer: TokenAmountInfo = {
        symbol: token.symbol,
        decimals: token.decimals,
        existentialDeposit: new BalanceFormatter(
          ("existentialDeposit" in token ? token.existentialDeposit : "0") ?? "0",
          token.decimals
        ),
        amount: new BalanceFormatter(tokensToPlanck(amount, token.decimals), token.decimals),
      }

      // check recipient's balance, prevent immediate reaping
      const recipientBalance = toBalance?.total.planck ?? 0n
      if (recipientBalance === 0n) {
        assert(
          transfer.amount.planck >= transfer.existentialDeposit.planck,
          `Please send at least ${transfer.existentialDeposit.tokens} ${transfer.symbol} to ensure the receiving address remains active.`
        )
      }

      if (!chainId) {
        assert(evmNetworkId, "Ethereum network not found")
        assert(gasSettings, "Missing gas information")

        try {
          // check fees again
          const provider = getExtensionEthereumProvider(evmNetworkId)
          const { baseFeePerGas } = await provider.getBlock("latest")
          const bigGasLimit = BigNumber.from(gasSettings.gasLimit)

          if (gasSettings.type === 2 && !baseFeePerGas)
            throw new Error("Could not load baseFeePerGas")

          const maxFeeAndGasCost =
            gasSettings.type === 0
              ? bigGasLimit.mul(gasSettings.gasPrice)
              : bigGasLimit.mul(gasSettings.maxFeePerGas)

          if (
            maxFeeAndGasCost
              .add(tokenIsNativeToken ? transfer.amount.planck : 0)
              .gt(nativeFromBalance?.transferable.planck ?? 0n)
          )
            throw new Error(`Insufficient ${nativeToken.symbol} balance to pay for gas`)

          setFormData((prev) => ({
            ...prev,
            ...newData,
          }))
          setExpectedResult({
            type: "evm",
            transfer,
            fees: {
              amount: new BalanceFormatter(maxFeeAndGasCost.toBigInt(), nativeToken.decimals),
              decimals: nativeToken.decimals,
              symbol: nativeToken.symbol,
              existentialDeposit: new BalanceFormatter("0", nativeToken.decimals),
            },
          })
        } catch (err) {
          if (
            ![
              "Could not load baseFeePerGas",
              `Insufficient ${nativeToken.symbol} balance to pay for gas`,
            ].includes((err as Error).message)
          )
            Sentry.captureException(err)
          throw new Error((err as Error).message)
        }
        return
      }

      const { partialFee, unsigned } = await api.assetTransferCheckFees(
        chainId,
        token.id,
        from,
        to,
        transfer.amount.planck.toString(),
        tip ?? "0",
        allowReap ? "transfer" : "transferKeepAlive"
      )

      const fees: TokenAmountInfo = {
        symbol: nativeToken.symbol,
        decimals: nativeToken.decimals,
        existentialDeposit: new BalanceFormatter(
          ("existentialDeposit" in nativeToken ? nativeToken.existentialDeposit : "0") ?? "0",
          nativeToken.decimals
        ),
        amount: new BalanceFormatter(BigInt(partialFee) + BigInt(tip ?? "0"), nativeToken.decimals),
      }

      // for each currency involved, check if sufficient balance and if it will cause account to be reaped
      const forfeits: TokenAmountInfo[] = []
      const testToken = (token: Token, balance: Balance | undefined, cost: BalanceFormatter) => {
        // sufficient balance?
        if ((balance?.transferable.planck ?? 0n) < cost.planck)
          throw new Error(`Insufficient balance (${token.symbol})`)

        // existential deposit?
        const remaining = (balance?.total.planck ?? 0n) - cost.planck
        if (
          remaining <
          BigInt(("existentialDeposit" in token ? token.existentialDeposit : "0") ?? "0")
        )
          forfeits.push({
            symbol: token.symbol,
            decimals: token.decimals,
            existentialDeposit: new BalanceFormatter(
              ("existentialDeposit" in token ? token.existentialDeposit : "0") ?? "0",
              token.decimals
            ),
            amount: new BalanceFormatter(remaining, token.decimals),
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
          new BalanceFormatter(transfer.amount.planck + fees.amount.planck, token.decimals)
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
        unsigned,
      })
    },
    [chainsMap, evmNetworksMap, nonEmptyBalances, tokensMap, transferableTokensMap]
  )

  // this makes user return to the first screen of the wizard
  const cancel = useCallback(() => {
    setExpectedResult(undefined)
    setHasAcceptedForfeit(false)
  }, [])

  // execute the TX
  const send = useCallback(async () => {
    const { amount, transferableTokenId, from, to, tip, gasSettings } = formData as SendTokensData

    const transferableToken = transferableTokensMap[transferableTokenId]
    if (!transferableToken) throw new Error("Transferable token not found")

    const { token, chainId, evmNetworkId } = transferableToken
    if (!token) throw new Error("Token not found")
    if (!chainId && !evmNetworkId) throw new Error("chain not found")

    if (chainId) {
      const { hash } = await api.assetTransfer(
        chainId,
        token.id,
        from,
        to,
        tokensToPlanck(amount, token.decimals),
        tip ?? "0",
        hasAcceptedForfeit ? "transfer" : "transferKeepAlive"
      )
      setTransactionHash(hash)
    } else if (evmNetworkId) {
      if (!gasSettings) throw new Error("Missing gas settings")
      const { hash } = await api.assetTransferEth(
        evmNetworkId,
        token.id,
        from,
        to,
        tokensToPlanck(amount, token.decimals),
        gasSettings
      )
      setTransactionHash(hash)
    } else throw new Error("Network not found")
  }, [formData, hasAcceptedForfeit, transferableTokensMap])

  const account = useMemo(
    () => accounts.find((acc) => acc.address === formData.from),
    [accounts, formData.from]
  )

  const approvalMode = useMemo((): "hwSubstrate" | "hwEthereum" | "qr" | "backend" => {
    if (account?.isHardware) {
      if (expectedResult?.type === "substrate") return "hwSubstrate"
      if (expectedResult?.type === "evm") return "hwEthereum"
    }
    if (account?.isQr) return "qr"
    return "backend"
  }, [account?.isHardware, account?.isQr, expectedResult?.type])

  // execute the TX
  const sendWithSignature = useCallback(
    async (formData: Partial<SendTokensData>, signature: `0x${string}`) => {
      if (expectedResult?.type !== "substrate") throw new Error("Review data not found")
      const { unsigned } = expectedResult
      if (!unsigned) throw new Error("Unsigned transaction not found")
      if (!formData.transferableTokenId) throw new Error("Transferable token not found")
      const transferableToken = transferableTokensMap[formData.transferableTokenId]
      if (!transferableToken) throw new Error("Transferable token not found")
      const { token } = transferableToken
      if (!token) throw new Error("Token not found")
      const { hash } = await api.assetTransferApproveSign(unsigned, signature, {
        tokenId: token.id,
        value: tokensToPlanck(formData.amount, token.decimals),
        to: formData.to,
      })
      setTransactionHash(hash)
    },
    [expectedResult, transferableTokensMap]
  )

  // execute the TX
  const sendWithSignatureEthereum = useCallback(
    async (unsigned: ethers.providers.TransactionRequest, signature: `0x${string}`) => {
      if (expectedResult?.type !== "evm") throw new Error("Review data not found")

      const { amount, transferableTokenId, to } = formData as SendTokensData
      const transferableToken = transferableTokensMap[transferableTokenId]
      if (!transferableToken) throw new Error("Transferable token not found")

      const { token, evmNetworkId } = transferableToken
      if (!token) throw new Error("Token not found")
      if (!evmNetworkId) throw new Error("network not found")

      const { hash } = await api.assetTransferEthHardware(
        evmNetworkId,
        token.id,
        amount,
        to,
        unsigned,
        signature
      )
      setTransactionHash(hash)
    },
    [expectedResult?.type, formData, transferableTokensMap]
  )

  // required to access review screen if an amount is to be forfeited
  const acceptForfeit = useCallback(async () => {
    // if hardware account, need to get a pending transaction that uses transfer (non-keep-alive)
    await check(formData as SendTokensInputs, true)
    setHasAcceptedForfeit(true)
  }, [check, formData])

  // components visibility
  const { showForm, showConfirmReap, showReview, showTransaction } = useMemo(() => {
    const showTransaction = Boolean(transactionHash)
    const requiresForfeit = Boolean(
      expectedResult?.type === "substrate" && expectedResult.forfeits.length
    )

    return {
      showForm: !showTransaction && (!expectedResult || (requiresForfeit && !hasAcceptedForfeit)),
      showConfirmReap: requiresForfeit && !hasAcceptedForfeit,
      showReview: Boolean(
        !showTransaction && expectedResult && (!requiresForfeit || hasAcceptedForfeit)
      ),
      showTransaction,
    }
  }, [expectedResult, hasAcceptedForfeit, transactionHash])

  const context = {
    account,
    formData,
    expectedResult,
    check,
    cancel,
    send,
    acceptForfeit,
    transactionHash,
    hasAcceptedForfeit,
    showForm,
    showConfirmReap,
    showReview,
    showTransaction,
    sendWithSignature,
    sendWithSignatureEthereum,
    transferableTokens,
    transferableToken,
    approvalMode,
  }

  return context
}

export const [SendTokensProvider, useSendTokens] = provideContext(useSendTokensProvider)
