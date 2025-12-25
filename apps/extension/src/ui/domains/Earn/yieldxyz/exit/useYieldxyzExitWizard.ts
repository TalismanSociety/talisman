import { EthNetworkId, Network } from "@talismn/chaindata-provider"
import { planckToTokens } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { TokenDto, YieldxyzPositionEnhanced } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"
import { erc20Abi, isHex } from "viem"

import { provideContext } from "@talisman/util/provideContext"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useNetworkById } from "@ui/state"

import { useYieldxyzActionValidation } from "../../hooks/useYieldxyzActionValidation"
import { useYieldxyzAction } from "../hooks/useYieldxyzAction"
import { useYieldxyzTransactionManager } from "../hooks/useYieldxyzActionManager"
import { useYieldxyzEnterModal } from "./useYieldxyzExitModal"

export type YieldxyzExitWizardInit = YieldxyzPositionEnhanced

export type YieldxyzExitWizardState = {
  step: "amount" | "confirm"
  position: YieldxyzExitWizardInit | null
  amountOut: bigint | null
}

const useErc20Balance = ({
  networkId,
  accountAddress,
  tokenAddress,
}: {
  networkId: EthNetworkId | undefined
  tokenAddress: string | null | undefined
  accountAddress: string | null | undefined
}) => {
  const publicClient = usePublicClient(networkId)

  return useQuery({
    queryKey: ["erc20-balance", publicClient?.uid, accountAddress, tokenAddress],
    enabled: !!publicClient && !!accountAddress && !!tokenAddress,
    queryFn: async () => {
      if (!publicClient || !isHex(accountAddress) || !isHex(tokenAddress)) return null

      try {
        const balance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [accountAddress],
        })
        return balance
      } catch (error) {
        log.error("Failed to fetch ERC20 balance", {
          error,
          accountAddress,
          tokenAddress,
          networkId,
        })
        return null
      }
    },
  })
}

const useBalanceTokenOut = ({
  token,
  address,
  network,
}: {
  network: Network | null | undefined
  token: TokenDto | null | undefined
  address: string | null | undefined
}) => {
  // here we need to consider the token is not known by talisman, as it's most likely a vault contract
  // lets consider it can only be either a ERC20 or SPL token for now
  const qErc20 = useErc20Balance({
    networkId: network?.id ?? undefined,
    tokenAddress: token?.address,
    accountAddress: address,
  })

  // always return one of them
  return useMemo(() => {
    switch (network?.platform) {
      default:
        return qErc20
    }
  }, [network?.platform, qErc20])
}

const useYieldxyzEnterWizardProvider = ({
  position,
}: {
  position: YieldxyzPositionEnhanced | null
}) => {
  const { close, isOpen } = useYieldxyzEnterModal()
  const [state, setState] = useState<YieldxyzExitWizardState>(() => ({
    step: "amount",
    position,
    amountOut: null,
  }))

  const network = useNetworkById(state.position?.networkId)

  const { data: balance } = useBalanceTokenOut({
    network,
    token: state.position?.product.token,
    address: state.position?.address,
  })

  const [inputs, talismanValidationError] = useMemo(() => {
    if (!state.amountOut || !position?.product.token || typeof balance !== "bigint")
      return [null, null]
    if (state.amountOut > balance) return [null, "Insufficient balance"]

    const inputs = {
      amount: planckToTokens(state.amountOut.toString(), position.product.token.decimals),
    }
    return [inputs, null]
  }, [state.amountOut, position?.product.token, balance])

  const { args, error: yieldxyzValidationError } = useYieldxyzActionValidation({
    schema: state.position?.product?.mechanics.arguments?.exit,
    inputs,
  })

  const {
    canCreateAction,
    action, // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
    isLoading: isLoadingAction,
    error: errorAction,
    createAction,
    refreshAction,
    submitActionTransaction,
  } = useYieldxyzAction({
    type: "exit",
    address: state.position?.address,
    yieldId: state.position?.yieldId,
    args,
  })

  const onAmountOutChanged = useCallback((amountOut: bigint | null) => {
    setState((state) => ({ ...state, amountOut }))
  }, [])

  const goTo = useCallback((step: YieldxyzExitWizardState["step"]) => {
    setState((state) => ({ ...state, step }))
  }, [])

  const onCompleted = useCallback(() => {
    if (isOpen) close()
  }, [close, isOpen])

  const setMaxAmountOut = useCallback(() => {
    if (typeof balance !== "bigint") return
    setState((state) => ({ ...state, amountOut: balance }))
  }, [balance])

  const { stepIndex, transaction, isProcessing, onSubmit } = useYieldxyzTransactionManager({
    action,
    address: state.position?.address,
    networkId: state.position?.networkId,
    refreshAction,
    submitActionTransaction,
    onCompleted,
  })

  useEffect(() => {
    log.debug("useYieldxyzExitWizard state changed", {
      ...state,
      action,
      isLoadingAction,
      errorAction,
      transaction,
    })
  }, [state, action, isLoadingAction, errorAction, transaction])

  return {
    ...state,
    network,
    balance,
    validationError: talismanValidationError ?? yieldxyzValidationError,
    goTo,
    onAmountOutChanged,
    setMaxAmountOut,
    onSubmit,
    isLoadingAction,
    isProcessing,
    action,
    errorAction,
    stepIndex,
    transaction,
    canCreateAction,
    createAction,
  }
}

export const [YieldxyzEnterWizardProvider, useYieldxyzEnterWizard] = provideContext(
  useYieldxyzEnterWizardProvider,
)
