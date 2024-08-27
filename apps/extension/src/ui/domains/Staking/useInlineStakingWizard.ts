import { TokenId } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { Address, BalanceFormatter } from "extension-core"
import { atom, useAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { Hex } from "viem"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"

import { useFeeToken } from "../SendFunds/useFeeToken"
import { useNominationPool } from "./useNominationPools"

type InlineStakingWizardStep = "form" | "review" | "follow-up"

type InlineStakingWizardState = {
  step: InlineStakingWizardStep
  address: Address | null
  tokenId: TokenId | null
  poolId: number | null
  plancks: bigint | null
  displayMode: "token" | "fiat"
  isAccountPickerOpen: boolean
  isPoolPickerOpen: boolean
  isSubmitting: boolean
  submitErrorMessage: string | null
  hash: Hex | null
}

const DEFAULT_STATE: InlineStakingWizardState = {
  step: "form",
  address: null,
  tokenId: null,
  poolId: 12,
  plancks: null,
  displayMode: "token",
  isAccountPickerOpen: false,
  isPoolPickerOpen: false,
  isSubmitting: false,
  submitErrorMessage: null,
  hash: null,
}

const inlineStakingWizardAtom = atom(DEFAULT_STATE)

const useInnerOpenClose = (key: "isAccountPickerOpen" | "isPoolPickerOpen") => {
  const [state, setState] = useAtom(inlineStakingWizardAtom)
  const isOpen = state[key]

  const setIsOpen = useCallback(
    (value: boolean) => setState((prev) => ({ ...prev, [key]: value })),
    [key, setState]
  )

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])

  const toggle = useCallback(
    () => setState((prev) => ({ ...prev, [key]: !prev[key] })),
    [key, setState]
  )

  return { isOpen, setIsOpen, open, close, toggle }
}

export const useInlineStakingWizard = () => {
  const [state, setState] = useAtom(inlineStakingWizardAtom)

  const { step, displayMode, hash, isSubmitting, submitErrorMessage } = state

  const account = useAccountByAddress(state.address)
  const token = useToken(state.tokenId)
  const feeToken = useFeeToken(token?.id)
  const pool = useNominationPool(token?.chain?.id, state.poolId)
  const tokenRates = useTokenRates(state.tokenId)
  const formatter = useMemo(
    () =>
      typeof state.plancks === "bigint"
        ? new BalanceFormatter(state.plancks, token?.decimals, tokenRates)
        : null,
    [state.plancks, token?.decimals, tokenRates]
  )

  const accountPicker = useInnerOpenClose("isAccountPickerOpen")
  const poolPicker = useInnerOpenClose("isPoolPickerOpen")

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

  const isFormValid = useMemo(
    () => !!account && !!token && !!pool && !!formatter,
    [account, formatter, pool, token]
  )

  const setStep = useCallback(
    (step: InlineStakingWizardStep) => {
      setState((prev) => {
        if (prev.step === "form" && step === "review" && !isFormValid) return prev

        return { ...prev, step }
      })
    },
    [isFormValid, setState]
  )

  const reset = useCallback(
    (init: Pick<InlineStakingWizardState, "address" | "tokenId">) =>
      setState({ ...DEFAULT_STATE, ...init }),
    [setState]
  )

  const { data: sapi } = useScaleApi(token?.chain?.id)

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: ["getExtrinsicPayload", "NominationPools.join", papiStringify(state)], // safe stringify because contains bigint
    queryFn: async () => {
      const { address, tokenId, poolId, plancks } = state
      if (!sapi || !address || !tokenId || !poolId || !plancks) return null
      return sapi.getExtrinsicPayload(
        "NominationPools",
        "join",
        {
          amount: plancks,
          pool_id: poolId,
        },
        { address }
      )
    },
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useQuery({
    queryKey: ["feeEstimate", payloadAndMetadata?.payload], // safe stringify because contains bigint
    queryFn: () => {
      if (!sapi || !payloadAndMetadata?.payload) return null
      return sapi.getFeeEstimate(payloadAndMetadata.payload)
    },
  })

  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (hash) setState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
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
    isFormValid,
    step,
    hash,
    isSubmitting,
    submitErrorMessage,
    feeToken,

    setAddress,
    setTokenId,
    setPoolId,
    setPlancks,
    setStep,
    toggleDisplayMode,
    reset,

    ...payloadAndMetadata,
    isLoadingPayload,
    errorPayload,

    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,

    onSubmitted,
  }
}
