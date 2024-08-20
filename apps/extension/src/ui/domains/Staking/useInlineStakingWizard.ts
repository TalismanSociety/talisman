import { TokenId } from "@talismn/chaindata-provider"
import { Address, BalanceFormatter } from "extension-core"
import { atom, useAtom } from "jotai"
import { useCallback, useMemo } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"

import { useNominationPool } from "./useNominationPools"

type InlineStakingModalState = {
  address: Address | null
  tokenId: TokenId | null
  poolId: number | null
  plancks: bigint | null
  displayMode: "token" | "fiat"
}

const DEFAULT_STATE: InlineStakingModalState = {
  address: null,
  tokenId: null,
  poolId: null,
  plancks: null,
  displayMode: "token",
}

const inlineStakingModalState = atom(DEFAULT_STATE)

export const useInlineStakingWizard = () => {
  const [state, setState] = useAtom(inlineStakingModalState)

  const { displayMode } = state

  const account = useAccountByAddress(state.address)
  const token = useToken(state.tokenId)
  const pool = useNominationPool(token?.chain?.id, state.poolId)
  const tokenRates = useTokenRates(state.tokenId)
  const formatter = useMemo(
    () =>
      typeof state.plancks === "bigint"
        ? new BalanceFormatter(state.plancks, token?.decimals, tokenRates)
        : null,
    [state.plancks, token?.decimals, tokenRates]
  )

  const accountPicker = useGlobalOpenClose("inlineStakingAccountPicker")
  const poolPicker = useGlobalOpenClose("inlineStakingPoolPicker")

  const setAddress = useCallback(
    (address: Address) => setState((prev) => ({ ...prev, address })),
    [setState]
  )

  const setTokenId = useCallback(
    (tokenId: TokenId) => setState((prev) => ({ ...prev, tokenId })),
    [setState]
  )

  const setPoolId = useCallback(
    (poolId: number) => setState((prev) => ({ ...prev, poolId })),
    [setState]
  )

  const setPlancks = useCallback(
    (plancks: bigint | null) => setState((prev) => ({ ...prev, plancks })),
    [setState]
  )

  const toggleDisplayMode = useCallback(() => {
    setState((prev) => ({ ...prev, displayMode: prev.displayMode === "token" ? "fiat" : "token" }))
  }, [setState])

  const reset = useCallback(
    (init: Pick<InlineStakingModalState, "address" | "tokenId">) =>
      setState({ ...DEFAULT_STATE, ...init }),
    [setState]
  )

  return {
    account,
    token,
    tokenRates,
    pool,
    formatter,
    displayMode,
    accountPicker,
    poolPicker,
    setAddress,
    setTokenId,
    setPoolId,
    setPlancks,
    toggleDisplayMode,
    reset,
  }
}
