import { provideContext } from "@talisman/util/provideContext"
import { subDTaoTokenId, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import { useBittensorStakingPayload } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPayload"
import { useBittensorCurrentHotkey } from "@ui/domains/Staking/hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import {
  useAccountByAddress,
  useAccounts,
  useBalance,
  useBalances,
  useNetworkById,
  useToken,
} from "@ui/state"
import { isAccountCompatibleWithNetwork } from "extension-core"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

type SwapBuyInputs = {
  address: string | null
  tokenIdIn: TokenId | null
  hotkey: string | null
  valueIn: bigint | null
  mevShield: boolean
}

const DEFAULT_INPUTS: SwapBuyInputs = {
  address: null,
  tokenIdIn: subNativeTokenId(BITTENSOR_NETWORK_ID),
  hotkey: null,
  valueIn: null,
  mevShield: false,
}

const useSwapBuyProvider = ({ netuid }: { netuid: number }) => {
  const defaultAddress = useBestAccountAddress()

  const [state, setState] = useState<SwapBuyInputs>(DEFAULT_INPUTS)

  const { tokenIdIn, valueIn, hotkey, address } = state
  const fromToken = useToken(state.tokenIdIn, "substrate-native")
  // target token doesnt have the validator address, because it will not exist unless user already has some
  const toTokenId = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid), [netuid])
  const toToken = useToken(toTokenId, "substrate-dtao")
  const account = useAccountByAddress(address)

  const currentHotkey = useBittensorCurrentHotkey({
    address,
    networkId: BITTENSOR_NETWORK_ID,
    netuid,
  })

  const balance = useBalance(address, tokenIdIn)

  const existentialDeposit = useExistentialDeposit(tokenIdIn)

  const maxValueIn = useMemo(() => {
    if (!balance || !existentialDeposit || balance.transferable.planck <= existentialDeposit.planck)
      return 0n
    return balance.transferable.planck - existentialDeposit.planck
  }, [balance, existentialDeposit])

  const onValueChange = useCallback((value: bigint | null) => {
    setState((s) => ({ ...s, valueIn: value }))
  }, [])

  const onAccountChange = useCallback((address: string | null) => {
    setState((s) => ({ ...s, address }))
  }, [])

  const onHotkeyChange = useCallback((hotkey: string | null) => {
    setState((s) => ({ ...s, hotkey }))
  }, [])

  //   const reset = useCallback(() => {
  //     setState((prev) => ({ ...prev, valueIn: null }))
  //   }, [])

  const refIsAccountInitialized = useRef(false)
  useEffect(() => {
    if (refIsAccountInitialized.current) return
    if (!state.address && defaultAddress) {
      setState((s) => ({ ...s, address: defaultAddress }))
      refIsAccountInitialized.current = true
    }
  }, [state.address, defaultAddress])

  useEffect(() => {
    if (currentHotkey) setState((s) => ({ ...s, hotkey: currentHotkey }))
  }, [currentHotkey])

  const canSubmit = false

  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)
  const {
    // alphaPrice,
    // payload,
    feeEstimatePayload,
    // txMetadata,
    // minTaoBond,
    // minTaoBondForInput,
    // minAlphaBond,
    // minTaoStake,
    // minTaoStakeForInput,
    // minAlphaUnstake,
    amountOut: valueOut,
    // talismanFee,
    // errorPayload: errorTx,
    // swapPrice,
    priceImpact,
    isLoading,
    isError,
    slippage,
  } = useBittensorStakingPayload({
    netuid,
    amountIn: valueIn,
    direction: "taoToAlpha",
    hotkey,
    address,
    networkId: BITTENSOR_NETWORK_ID,
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: feeEstimatePayload })

  return {
    netuid,
    fromTokenId: tokenIdIn,
    fromToken,
    toTokenId,
    toToken,
    valueIn,
    maxValueIn,
    valueOut,
    hotkey,
    address,
    account,
    canSubmit,
    priceImpact,
    slippage,

    isLoading,
    isError,

    feeEstimate,
    isLoadingFeeEstimate: isLoading || isLoadingFeeEstimate,
    errorFeeEstimate,
    // reset,
    onAccountChange,
    onHotkeyChange,
    onValueChange,
  }
}

export const [SwapBuyProvider, useSwapBuy] = provideContext(useSwapBuyProvider)

const useBestAccountAddress = () => {
  const network = useNetworkById(BITTENSOR_NETWORK_ID)
  const accounts = useAccounts("owned")
  const balances = useBalances("owned")

  const compatibleAccounts = useMemo(() => {
    if (!network) return []
    return accounts.filter((account) => isAccountCompatibleWithNetwork(network, account))
  }, [accounts, network])

  return useMemo(() => {
    // pick the account that has the most transferable tao
    const taoBalances = balances.find({ tokenId: subNativeTokenId(BITTENSOR_NETWORK_ID) })
    const bestBalance = taoBalances.each
      .concat()
      .sort((a, b) => (b.transferable.planck - a.transferable.planck > 0 ? 1 : -1))[0]
    return bestBalance?.address ?? compatibleAccounts[0]?.address ?? null
  }, [balances, compatibleAccounts])
}
