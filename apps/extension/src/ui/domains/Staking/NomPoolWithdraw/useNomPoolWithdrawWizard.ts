import { Enum } from "@polkadot-api/substrate-bindings"
import { TokenId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { Address, BalanceFormatter } from "extension-core"
import { atom, useAtom, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Hex } from "viem"

import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalance } from "@ui/hooks/useBalance"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"

import { useExistentialDeposit } from "../../../hooks/useExistentialDeposit"
import { useCurrentStakingEra } from "../shared/useCurrentStakingEra"
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

const wizardAtom = atom(DEFAULT_STATE)

export const useResetNomPoolWithdrawWizard = () => {
  const setState = useSetAtom(wizardAtom)

  const reset = useCallback(
    (init: Pick<WizardState, "address" | "tokenId">) => setState({ ...DEFAULT_STATE, ...init }),
    [setState]
  )

  return reset
}

export const useNomPoolWithdrawWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const [{ address, step, hash, tokenId }, setState] = useAtom(wizardAtom)

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)

  const { data: pool } = useNomPoolByMember(token?.chain?.id, account?.address)
  const { data: sapi } = useScaleApi(token?.chain?.id)

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent("NomPool Withdraw", { tokenId })
      if (hash) setState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, setState, tokenId]
  )

  const { data: currentEra } = useCurrentStakingEra(token?.chain?.id)

  const pointsToWithdraw = useMemo(() => {
    if (!currentEra || !pool) return null
    return pool.unbonding_eras
      .filter(([era]) => era < currentEra)
      .reduce((acc, [, points]) => acc + points, 0n)
  }, [currentEra, pool])

  const { data: plancksToWithdraw } = useQuery({
    queryKey: ["pointsToBalance", sapi?.id, pool?.pool_id, pointsToWithdraw?.toString()],
    queryFn: async () => {
      if (!sapi || !pool) return null
      return sapi.getRuntimeCallValue("NominationPoolsApi", "points_to_balance", [
        pool.pool_id,
        pointsToWithdraw,
      ])
    },
  })

  const amountToWithdraw = useMemo(
    () =>
      typeof plancksToWithdraw === "bigint"
        ? new BalanceFormatter(plancksToWithdraw, token?.decimals, tokenRates)
        : null,
    [plancksToWithdraw, token?.decimals, tokenRates]
  )

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: ["getExtrinsicPayload", "NominationPools.withdraw_unbonded", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null

      return sapi.getExtrinsicPayload(
        "NominationPools",
        "withdraw_unbonded",
        {
          member_account: Enum("Id", address),
          num_slashing_spans: 0, // :jean:
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
    if (amountToWithdraw?.planck === 0n) return t("There is no balance to withdraw")

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
  }, [amountToWithdraw?.planck, t, balance, feeEstimate, existentialDeposit?.planck])

  return {
    token,
    poolId: pool?.pool_id,
    account,
    balance,
    feeToken,
    tokenRates,
    step,
    hash,
    amountToWithdraw,

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
