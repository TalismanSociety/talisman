import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { bind } from "@react-rxjs/core"
import { getBalanceId } from "@talismn/balances"
import { subDTaoTokenId, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import { useBittensorStakeInputError } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakeInputError"
import { useBittensorStakingPayload } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPayload"
import { getDefaultValidatorHotkey } from "@ui/domains/Staking/Bittensor/utils/getDefaultValidatorHotkey"
import { useBittensorCurrentHotkey } from "@ui/domains/Staking/hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { type BalancesByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { provideContext } from "@ui/util/provideContext"
import { merge } from "lodash-es"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BehaviorSubject } from "rxjs"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { useSwapSubmit } from "./useSwapSubmit"

// keep track of the last selected account globally, as the provider will be reset each time its unmounted
const subjectLastSelectedAddress = new BehaviorSubject<string | null>(null)
const [useLastSelectedAddress] = bind(subjectLastSelectedAddress)

type SwapBuyInputs = {
  address: string | null
  tokenIdIn: TokenId | null
  hotkey: string | null
  valueIn: bigint | null
}

const DEFAULT_INPUTS: SwapBuyInputs = {
  address: null,
  tokenIdIn: subNativeTokenId(BITTENSOR_NETWORK_ID),
  hotkey: null,
  valueIn: null,
}

const useSwapBuyProvider = ({ netuid }: { netuid: number }) => {
  const lastSelectedAddress = useLastSelectedAddress()
  const defaultAddress = useBestAccountAddress()
  const allBalances = useBalances("owned")
  const remoteConfig = useRemoteConfig()

  const [state, setState] = useState<SwapBuyInputs>(
    // preselect account straight up to prevent flickering
    () => {
      const address = lastSelectedAddress || defaultAddress || null
      return merge({}, DEFAULT_INPUTS, {
        address,
        hotkey: getDefaultValidatorHotkey(netuid, remoteConfig, allBalances, address) ?? null,
      })
    }
  )
  const { tokenIdIn, valueIn, hotkey, address } = state
  const tokenIn = useToken(state.tokenIdIn, "substrate-native")
  // target token doesnt have the validator address, because it will not exist unless user already has some
  const tokenIdOutGeneric = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid), [netuid])
  const tokenIdOutDynamic = useMemo(
    () => (hotkey ? subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid, hotkey) : null),
    [netuid, hotkey]
  )
  const tokenOutGeneric = useToken(tokenIdOutGeneric, "substrate-dtao")
  const tokenOutDynamic = useToken(tokenIdOutDynamic, "substrate-dtao")

  const account = useAccountByAddress(address)

  const currentHotkey = useBittensorCurrentHotkey({
    address,
    networkId: BITTENSOR_NETWORK_ID,
    netuid,
  })

  const balancesProps = useMemo(
    (): BalancesByParamsProps =>
      address && tokenIdIn
        ? {
            addressesAndTokens: {
              addresses: [address],
              tokenIds: [tokenIdIn, tokenOutDynamic?.id ?? ""].filter(Boolean),
            },
          }
        : {
            addressesAndTokens: undefined,
          },
    [address, tokenIdIn, tokenOutDynamic]
  )
  const { status: balancesStatus, balances } = useBalancesByParams(balancesProps)
  const isBalancesLoading = balancesStatus === "initialising"

  const balanceTokenIn = useMemo(() => {
    if (!address || !tokenIdIn) return null
    return balances.get(getBalanceId({ address, tokenId: tokenIdIn })) ?? null
  }, [balances, address, tokenIdIn])

  const balanceTokenOut = useMemo(() => {
    if (!address || !tokenIdOutDynamic) return null
    return balances.get(getBalanceId({ address, tokenId: tokenIdOutDynamic })) ?? null
  }, [balances, address, tokenIdOutDynamic])

  const existentialDeposit = useExistentialDeposit(tokenIdIn)

  const maxValueIn = useMemo(() => {
    if (
      !balanceTokenIn ||
      !existentialDeposit ||
      balanceTokenIn.transferable.planck <= existentialDeposit.planck
    )
      return 0n
    return balanceTokenIn.transferable.planck - existentialDeposit.planck
  }, [balanceTokenIn, existentialDeposit])

  const onValueChange = useCallback((value: bigint | null) => {
    setState((s) => ({ ...s, valueIn: value }))
  }, [])

  const onAccountChange = useCallback((address: string | null) => {
    setState((s) => ({ ...s, address }))
  }, [])

  const onHotkeyChange = useCallback((hotkey: string | null) => {
    setState((s) => ({ ...s, hotkey }))
  }, [])

  const resetValueIn = useCallback(() => {
    setState((prev) => ({ ...prev, valueIn: null }))
  }, [])

  const {
    isMevShieldDisabled,
    isMevShieldFeatureDisabled,
    withMevShield,
    setIsMevProtectionEnabled,
    txMode,
    onSubmit,
  } = useSwapSubmit({ netuid, account, direction: "buy", resetValueIn })

  const refIsAccountInitialized = useRef(false)
  useEffect(() => {
    if (refIsAccountInitialized.current) return
    // prefill the address with the best account if none is selected yet
    const bestAddress = lastSelectedAddress || defaultAddress || null
    if (!state.address && bestAddress) {
      setState((s) => ({ ...s, address: bestAddress }))
      refIsAccountInitialized.current = true
    }
  }, [state.address, defaultAddress, lastSelectedAddress])

  useEffect(() => {
    // keep track of the last selected address globally
    if (address) {
      subjectLastSelectedAddress.next(address)
    }
  }, [address])

  useEffect(() => {
    if (currentHotkey) setState((s) => ({ ...s, hotkey: currentHotkey }))
  }, [currentHotkey])

  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)

  const {
    payload,
    feeEstimatePayload,
    txMetadata,
    minTaoBondForInput,
    minTaoStakeForInput,
    amountOut: valueOut,
    priceImpact,
    isLoading,
    isError,
    slippage,
    talismanFee,
    swapPrice,
  } = useBittensorStakingPayload({
    netuid,
    amountIn: valueIn,
    direction: "taoToAlpha",
    hotkey,
    address,
    networkId: BITTENSOR_NETWORK_ID,
  })

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!tokenIdIn || typeof valueIn !== "bigint" || typeof valueOut !== "bigint" || !hotkey)
      return undefined
    return {
      type: "bittensor-staking",
      fromTokenId: tokenIdIn,
      toTokenId: tokenIdOutGeneric,
      fromAmount: valueIn.toString(),
      toAmount: valueOut.toString(),
      hotkey,
    }
  }, [tokenIdIn, valueIn, valueOut, tokenIdOutGeneric, hotkey])

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: feeEstimatePayload })

  const { isValid, inputErrorMessage } = useBittensorStakeInputError({
    networkId: BITTENSOR_NETWORK_ID,
    taoAmountIn: valueIn,
    taoBalance: isBalancesLoading ? null : (balanceTokenIn?.transferable.planck ?? 0n),
    dtaoBalance: isBalancesLoading ? null : (balanceTokenOut?.transferable.planck ?? 0n),
    feeEstimate,
    minTaoBondForInput,
    minTaoStakeForInput,
  })

  const canSubmit = !!payload && isValid && !inputErrorMessage

  return {
    netuid,
    tokenIdIn,
    tokenIn,
    tokenIdOutGeneric,
    tokenOutGeneric,
    isBalancesLoading,
    balanceTokenIn,
    balanceTokenOut,
    valueIn,
    maxValueIn,
    valueOut,
    hotkey,
    address,
    account,
    taoToken: tokenIn,
    dtaoToken: tokenOutGeneric, // the dynamic one might not exist yet

    canSubmit,
    swapPrice,
    priceImpact,
    slippage,
    talismanFee,

    withMevShield,
    isMevShieldDisabled,
    isMevShieldFeatureDisabled,
    setIsMevProtectionEnabled,

    isLoading,
    isError,

    feeEstimate,
    isLoadingFeeEstimate: isLoading || isLoadingFeeEstimate,
    errorFeeEstimate,

    inputErrorMessage,
    payload,
    txMetadata,
    txInfo,
    txMode,
    onSubmit,

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
