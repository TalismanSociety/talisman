import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { Address, BalanceFormatter } from "extension-core"
import { SetStateAction, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"
import { Hex } from "viem"

import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress, useBalance, useToken, useTokenRates, useTransaction } from "@ui/state"

import { useExistentialDeposit } from "../../../hooks/useExistentialDeposit"
import { useGetUnbondInfo } from "../shared/useGetUnbondInfo"

type WizardStep = "review" | "follow-up"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  hash: Hex | null
  poolId: number | string | undefined
}

const DEFAULT_STATE: WizardState = {
  step: "review",
  address: null,
  tokenId: null,
  hash: null,
  poolId: undefined,
}

const wizardState$ = new BehaviorSubject(DEFAULT_STATE)

const setWizardState = (state: SetStateAction<WizardState>) => {
  if (typeof state === "function") wizardState$.next(state(wizardState$.value))
  else wizardState$.next(state)
}

const [useWizardState] = bind(wizardState$)

export const useResetNomPoolUnbondWizard = () => {
  return useCallback(
    (init: Pick<WizardState, "address" | "tokenId" | "poolId">) =>
      setWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )
}

export const useUnbondWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { address, step, hash, tokenId, poolId: unstakePoolId } = useWizardState()

  const tx = useTransaction(hash || "0x")

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)

  const { data: sapi } = useScaleApi(token?.chain?.id)

  const {
    pool,
    poolId,
    plancksToUnbond,
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    unbondType,
    canStake,
    isCanStakeLoading,
    handleSuccess,
  } = useGetUnbondInfo({
    sapi,
    chainId: token?.chain?.id,
    address: account?.address,
    unstakePoolId,
  })

  useEffect(() => {
    if (hash && tx?.blockNumber && tx?.status === "success" && handleSuccess) {
      handleSuccess(Number(tx.blockNumber))
    }
  }, [handleSuccess, hash, tx])

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent(`${unbondType} Unbond`, { tokenId })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, tokenId, unbondType],
  )

  const amountToUnbond = useMemo(
    () =>
      typeof plancksToUnbond === "bigint"
        ? new BalanceFormatter(plancksToUnbond, token?.decimals, tokenRates)
        : null,
    [plancksToUnbond, token?.decimals, tokenRates],
  )

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

  const stakeWarningMessage = useMemo(() => {
    if (!canStake) return t("Stake/unstake currently paused")
    return null
  }, [canStake, t])

  return {
    token,
    poolId,
    account,
    balance,
    feeToken,
    tokenRates,
    step,
    hash,
    amountToUnbond,

    payload: !errorMessage && canStake && !isCanStakeLoading ? payload : null,
    txMetadata,
    isLoadingPayload,
    errorPayload,

    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,

    errorMessage,
    stakeWarningMessage,

    onSubmitted,
  }
}
