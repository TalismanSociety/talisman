import { provideContext } from "@talisman/util/provideContext"
import { getBalanceId } from "@talismn/balances"
import { subDTaoTokenId, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import { useBittensorStakeInputError } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakeInputError"
import { useBittensorStakingPayload } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPayload"
import { useBittensorCurrentHotkey } from "@ui/domains/Staking/hooks/bittensor/useGetBittensorStakeHotkeys"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { type BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useAccountByAddress, useAccounts, useBalances, useNetworkById, useToken } from "@ui/state"
import {
  isAccountCompatibleWithNetwork,
  isAccountExternal,
  type WalletTransactionInfo,
} from "extension-core"
import { log } from "extension-shared"
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
  const tokenIn = useToken(state.tokenIdIn, "substrate-native")
  // target token doesnt have the validator address, because it will not exist unless user already has some
  const tokenIdOutGeneric = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid), [netuid])
  const tokenIdOutDynamic = useMemo(
    () => (hotkey ? subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid, hotkey) : null),
    [netuid, hotkey]
  )
  const tokenOutGeneric = useToken(tokenIdOutGeneric, "substrate-dtao")
  const account = useAccountByAddress(address)

  const currentHotkey = useBittensorCurrentHotkey({
    address,
    networkId: BITTENSOR_NETWORK_ID,
    netuid,
  })

  const balancesProps = useMemo(
    (): BalanceByParamsProps =>
      address && tokenIdIn && tokenIdOutDynamic
        ? {
            addressesAndTokens: {
              addresses: [address],
              tokenIds: [tokenIdIn, tokenIdOutDynamic],
            },
          }
        : {
            addressesAndTokens: undefined,
          },
    [address, tokenIdIn, tokenIdOutDynamic]
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

  const onSubmit = useCallback((hash: `0x${string}`) => {
    log.debug("Transaction submitted", { hash })
    // TODO toast ?
  }, [])

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

  const canUseMEVShield = useMemo(() => {
    return !isAccountExternal(account)
  }, [account])

  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)
  const {
    // alphaPrice,
    payload,
    feeEstimatePayload,
    txMetadata,
    // minTaoBond,
    minTaoBondForInput,
    // minAlphaBond,
    // minTaoStake,
    minTaoStakeForInput,
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

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!tokenIdIn || typeof valueIn !== "bigint" || typeof valueOut !== "bigint") return undefined
    return {
      type: "bittensor-staking",
      fromTokenId: tokenIdIn,
      toTokenId: tokenIdOutGeneric,
      fromAmount: valueIn.toString(),
      toAmount: valueOut.toString(),
    }
  }, [tokenIdIn, valueIn, valueOut, tokenIdOutGeneric])

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
    canSubmit,
    priceImpact,
    slippage,
    canUseMEVShield,

    isLoading,
    isError,

    feeEstimate,
    isLoadingFeeEstimate: isLoading || isLoadingFeeEstimate,
    errorFeeEstimate,

    inputErrorMessage,
    payload,
    txMetadata,
    txInfo,
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
