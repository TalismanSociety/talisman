import { Enum } from "@polkadot-api/substrate-bindings"
import { TokenId } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { Address, BalanceFormatter } from "extension-core"
import { atom, useAtom, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Hex } from "viem"

import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"

import { useExistentialDeposit } from "../useExistentialDeposit"
import { useNomPoolByMember } from "../useNomPoolByMember"

type UnstakeWizardStep = "review" | "follow-up"

type UnstakeWizardState = {
  step: UnstakeWizardStep
  address: Address | null
  tokenId: TokenId | null
  isSubmitting: boolean
  submitErrorMessage: string | null
  hash: Hex | null
}

const DEFAULT_STATE: UnstakeWizardState = {
  step: "review",
  address: null,
  tokenId: null,
  isSubmitting: false,
  submitErrorMessage: null,
  hash: null,
}

const unstakeWizardAtom = atom(DEFAULT_STATE)

export const useResetUnstakeWizard = () => {
  const setState = useSetAtom(unstakeWizardAtom)

  const reset = useCallback(
    (init: Pick<UnstakeWizardState, "address" | "tokenId">) =>
      setState({ ...DEFAULT_STATE, ...init }),
    [setState]
  )

  return reset
}

export const useUnstakeWizard = () => {
  const { t } = useTranslation()
  const [state, setState] = useAtom(unstakeWizardAtom)
  const { address, step, hash } = state

  const balance = useBalance(state.address, state.tokenId)
  const account = useAccountByAddress(state.address)
  const token = useToken(state.tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(state.tokenId)

  const { data: pool } = useNomPoolByMember(token?.chain?.id, account?.address)
  const { data: sapi } = useScaleApi(token?.chain?.id)

  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (hash) setState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [setState]
  )

  const { data: plancksToUnbond } = useQuery({
    queryKey: ["pointsToBalance", sapi?.id, papiStringify(pool)],
    queryFn: async () => {
      if (!sapi || !pool) return null
      return sapi.getRuntimeCallValue("NominationPoolsApi", "points_to_balance", [
        pool.poolId,
        pool.points,
      ])
    },
  })

  const amountToUnbond = useMemo(
    () =>
      typeof plancksToUnbond === "bigint"
        ? new BalanceFormatter(plancksToUnbond, token?.decimals, tokenRates)
        : null,
    [plancksToUnbond, token?.decimals, tokenRates]
  )

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: [
      "getExtrinsicPayload",
      "NominationPools.unbond",
      sapi?.id,
      address,
      papiStringify(pool),
    ],
    queryFn: async () => {
      if (!sapi || !address || !pool) return null

      // TODO balance check ?

      return sapi.getExtrinsicPayload(
        "NominationPools",
        "unbond",
        {
          member_account: Enum("Id", address),
          unbonding_points: pool.points,
        },
        { address }
      )
    },
  })

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useQuery({
    queryKey: ["feeEstimate", payload], // safe stringify because contains bigint
    queryFn: () => {
      if (!sapi || !payload) return null
      return sapi.getFeeEstimate(payload)
    },
  })

  const existentialDeposit = useExistentialDeposit(token?.id)

  const errorMessage = useMemo(() => {
    if (!!balance && !!feeEstimate && feeEstimate > balance.transferable.planck)
      return t("Insufficient balance to cover fee")

    if (
      !!balance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      existentialDeposit.planck + feeEstimate > balance.transferable.planck
    )
      return t("Insufficient balance to cover fee and keep account alive")

    return null
  }, [balance, feeEstimate, t, existentialDeposit?.planck])

  return {
    token,
    poolId: pool?.poolId,
    account,
    balance,
    feeToken,
    tokenRates,
    step,
    hash,
    amountToUnbond,

    payload: !errorMessage ? payload : null,
    txMetadata,
    isLoadingPayload,
    errorPayload,

    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,

    errorMessage,

    onSubmitted,
  }
}
