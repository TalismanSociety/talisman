import { provideContext } from "@talisman/util/provideContext"
import { subDTaoTokenId, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
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
  fromTokenId: TokenId | null
  hotkey: string | null
  value: bigint | null
}

const DEFAULT_INPUTS: SwapBuyInputs = {
  address: null,
  fromTokenId: subNativeTokenId(BITTENSOR_NETWORK_ID),
  hotkey: null,
  value: null,
}

const useSwapBuyProvider = ({ netuid }: { netuid: number }) => {
  const defaultAddress = useBestAccountAddress()

  const [state, setState] = useState<SwapBuyInputs>(DEFAULT_INPUTS)

  const { fromTokenId, value, hotkey, address } = state
  const fromToken = useToken(state.fromTokenId)
  // target token doesnt have the validator address, because it will not exist unless user already has some
  const toTokenId = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid), [netuid])
  const toToken = useToken(toTokenId)
  const account = useAccountByAddress(address)

  const balance = useBalance(address, fromTokenId)

  const existentialDeposit = useExistentialDeposit(fromTokenId)

  const maxValue = useMemo(() => {
    if (!balance || !existentialDeposit || balance.transferable.planck <= existentialDeposit.planck)
      return 0n
    return balance.transferable.planck - existentialDeposit.planck
  }, [balance, existentialDeposit])

  const onValueChange = useCallback((value: bigint | null) => {
    setState((s) => ({ ...s, value }))
  }, [])

  const onAccountChange = useCallback((address: string | null) => {
    setState((s) => ({ ...s, address }))
  }, [])

  const onHotkeyChange = useCallback((hotkey: string | null) => {
    setState((s) => ({ ...s, hotkey }))
  }, [])

  const refIsAccountInitialized = useRef(false)
  useEffect(() => {
    if (refIsAccountInitialized.current) return
    if (!state.address && defaultAddress) {
      setState((s) => ({ ...s, address: defaultAddress }))
      refIsAccountInitialized.current = true
    }
  }, [state.address, defaultAddress])

  //   useEffect(() => {
  //     console.log("SwapBuyProvider state:", { ...state, maxValue, existentialDeposit })
  //   }, [state, maxValue, existentialDeposit])

  return {
    netuid,
    fromTokenId,
    fromToken,
    toTokenId,
    toToken,
    value,
    maxValue,
    hotkey,
    address,
    account,
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
