import { Enum } from "@polkadot-api/substrate-bindings"
import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { Address, BalanceFormatter } from "extension-core"
import { SetStateAction, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"
import { Hex } from "viem"

import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress, useBalance, useToken, useTokenRates } from "@ui/state"

import { useExistentialDeposit } from "../../../hooks/useExistentialDeposit"
import { useNomPoolByMember } from "../shared/useNomPoolByMember"

type WizardStep = "review" | "follow-up"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  hash: Hex | null
}

const DEFAULT_STATE: WizardState = {
  step: "review",
  address: null,
  tokenId: null,
  hash: null,
}

const wizardState$ = new BehaviorSubject(DEFAULT_STATE)

const setWizardState = (state: SetStateAction<WizardState>) => {
  if (typeof state === "function") wizardState$.next(state(wizardState$.value))
  else wizardState$.next(state)
}

const [useWizardState] = bind(wizardState$)

export const useResetNomPoolUnbondWizard = () => {
  return useCallback(
    (init: Pick<WizardState, "address" | "tokenId">) =>
      setWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )
}

export const useNomPoolUnbondWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { address, step, hash, tokenId } = useWizardState()

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)

  const { data: pool } = useNomPoolByMember(token?.chain?.id, account?.address)
  const { data: sapi } = useScaleApi(token?.chain?.id)

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent("NomPool Unbond", { tokenId })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, tokenId],
  )

  const { data: plancksToUnbond } = useQuery({
    queryKey: ["pointsToBalance", sapi?.id, papiStringify(pool)],
    queryFn: async () => {
      if (!sapi || !pool) return null
      return sapi.getRuntimeCallValue("NominationPoolsApi", "points_to_balance", [
        pool.pool_id,
        pool.points,
      ])
    },
  })

  const amountToUnbond = useMemo(
    () =>
      typeof plancksToUnbond === "bigint"
        ? new BalanceFormatter(plancksToUnbond, token?.decimals, tokenRates)
        : null,
    [plancksToUnbond, token?.decimals, tokenRates],
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

      return sapi.getExtrinsicPayload(
        "NominationPools",
        "unbond",
        {
          member_account: Enum("Id", address),
          unbonding_points: pool.points,
        },
        { address },
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
    if (!!pool && !pool.points) return t("There is no balance to unbond")

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
  }, [pool, t, balance, feeEstimate, existentialDeposit?.planck])

  return {
    token,
    poolId: pool?.pool_id,
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
