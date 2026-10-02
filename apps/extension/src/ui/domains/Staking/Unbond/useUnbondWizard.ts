import type { Address } from "@core/types/base"
import { BalanceFormatter } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import type { InlineError } from "@ui/hooks/analytics/errorShown"
import { flows, useFlow } from "@ui/hooks/analytics/flows"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalance } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { useExistentialDeposit } from "../../../hooks/useExistentialDeposit"
import { stakingSubmittedReport } from "../shared/stakingAnalytics"
import { useGetUnbondInfo } from "../shared/useGetUnbondInfo"
import { useUnbondModal } from "./useUnbondModal"

type WizardStep = "review" | "follow-up"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  hash: Hex | null
}

const useUnbondWizardProvider = () => {
  const { t } = useTranslation()
  const { args, isOpen } = useUnbondModal()

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

  const { data: sapi } = useScaleApi(token?.networkId)

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
  } = useGetUnbondInfo({
    sapi,
    chainId: token?.networkId,
    address: account?.address,
  })

  const amountToUnbond = useMemo(
    () =>
      typeof plancksToUnbond === "bigint"
        ? new BalanceFormatter(plancksToUnbond, token?.decimals, tokenRates)
        : null,
    [plancksToUnbond, token?.decimals, tokenRates]
  )

  const network = useNetworkById(token?.networkId)

  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (!hash) return
      const report = stakingSubmittedReport({
        account,
        network,
        symbol: token?.symbol,
        usd: amountToUnbond?.fiat("usd"),
      })
      if (report) flows.staking.submitted({ ...report, transactionId: hash })
      setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [account, network, token?.symbol, amountToUnbond]
  )

  useFlow(flows.staking, {
    active: isOpen && !!args,
    entry: args?.entry ?? "token_details",
    started: { mode: "unstake" },
    attributes: { staking_type: "nomination_pool", direction: "unstake" },
    step: step === "review" ? "review" : null,
  })

  const existentialDeposit = useExistentialDeposit(token?.id)

  const error = useMemo<InlineError | null>(() => {
    if (pool && !pool.points)
      return { message: t("There is no balance to unbond"), category: "input_invalid" }

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
  }, [pool, t, balance, feeEstimate, existentialDeposit?.planck])

  const errorMessage = error?.message ?? null

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

export const [UnbondWizardProvider, useUnbondWizard] = provideContext(useUnbondWizardProvider)
