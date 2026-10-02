import { tokenSymbolForAnalytics } from "@common/analytics/funds"
import type { Address } from "@core/types/base"
import { Enum } from "@polkadot-api/substrate-bindings"
import { BalanceFormatter } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import type { InlineError } from "@ui/hooks/analytics/errorShown"
import { flows, useFlow } from "@ui/hooks/analytics/flows"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useSignerPayloadQuery } from "@ui/hooks/sapi/useSignerPayloadQuery"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalance } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { useExistentialDeposit } from "../../../hooks/useExistentialDeposit"
import { useActiveStakingEra } from "../hooks/nomPools/useActiveStakingEra"
import { useNomPoolByMember } from "../hooks/nomPools/useNomPoolByMember"
import { stakingSubmittedReport } from "../shared/stakingAnalytics"
import { useGetFeeEstimate } from "../shared/useGetFeeEstimate"
import { useNomPoolWithdrawModal } from "./useNomPoolWithdrawModal"

type WizardStep = "review" | "follow-up"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  hash: Hex | null
}

const useNomPoolWithdrawWizardProvider = () => {
  const { t } = useTranslation()
  const { args, isOpen } = useNomPoolWithdrawModal()

  const [{ address, step, hash, tokenId }, setWizardState] = useState<WizardState>(() => ({
    step: "review",
    address: args?.address ?? null,
    tokenId: args?.tokenId ?? null,
    hash: null,
  }))

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)

  const { data: pool } = useNomPoolByMember(token?.networkId, account?.address)
  const { data: sapi } = useScaleApi(token?.networkId)

  const { data: activeEra } = useActiveStakingEra(token?.networkId)

  const pointsToWithdraw = useMemo(() => {
    if (!activeEra || !pool) return null
    return pool.unbonding_eras
      .filter(([era]) => era <= activeEra)
      .reduce((acc, [, points]) => acc + points, 0n)
  }, [activeEra, pool])

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

  const network = useNetworkById(token?.networkId)

  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (!hash) return
      const report = stakingSubmittedReport({
        account,
        network,
        symbol: tokenSymbolForAnalytics(token),
        usd: amountToWithdraw?.fiat("usd"),
      })
      if (report) flows.staking.submitted({ ...report, transactionId: hash })
      setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [account, network, token, amountToWithdraw]
  )

  useFlow(flows.staking, {
    active: isOpen && !!args,
    entry: args?.entry ?? "token_details",
    started: { mode: "withdraw" },
    attributes: { staking_type: "nomination_pool", direction: "withdraw" },
    step: step === "review" ? "review" : null,
  })

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = useSignerPayloadQuery({
    sapi,
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
  } = useGetFeeEstimate({ sapi, payload })

  const existentialDeposit = useExistentialDeposit(token?.id)

  const error = useMemo<InlineError | null>(() => {
    if (amountToWithdraw?.planck === 0n)
      return { message: t("There is no balance to withdraw"), category: "input_invalid" }

    if (balance && feeEstimate && feeEstimate > balance.transferable.planck)
      return { message: t("Insufficient balance to cover fee"), category: "insufficient_fee" }

    if (
      balance &&
      feeEstimate &&
      existentialDeposit?.planck &&
      existentialDeposit.planck + feeEstimate > balance.transferable.planck
    )
      return {
        message: t("Insufficient balance to cover fee and keep account alive"),
        category: "insufficient_fee",
      }

    return null
  }, [amountToWithdraw?.planck, t, balance, feeEstimate, existentialDeposit?.planck])

  const errorMessage = error?.message ?? null

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
    errorCategory: error?.category,

    onSubmitted,
  }
}

export const [NomPoolWithdrawWizardProvider, useNomPoolWithdrawWizard] = provideContext(
  useNomPoolWithdrawWizardProvider
)
