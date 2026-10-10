import { classifyError } from "@common/analytics/errorCategory"
import { tokenSymbolForAnalytics } from "@common/analytics/funds"
import { BalanceFormatter, findEvmMirrorWithdrawable } from "@talismn/balances"
import { useForm, useStore } from "@tanstack/react-form"
import { valueReport } from "@ui/domains/Staking/shared/stakingAnalytics"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { type InlineError, useErrorShown } from "@ui/hooks/analytics/errorShown"
import { flows, useFlow } from "@ui/hooks/analytics/flows"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useSignerPayloadQuery } from "@ui/hooks/sapi/useSignerPayloadQuery"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalance } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { z } from "zod/v4"

import { useEvmMirrorWithdrawModal } from "./useEvmMirrorWithdrawModal"

export const EVM_MIRROR_WITHDRAW_MODAL_CONTAINER_ID = "evm-mirror-withdraw-modal"

const schema = z.object({ plancks: z.bigint().positive() })

type FormData = { plancks: bigint | null }

export type EvmMirrorWithdrawStep = "amount" | "confirm" | "submitted"

const useEvmMirrorWithdrawWizardProvider = () => {
  const { t } = useTranslation()
  const { args, isOpen, close } = useEvmMirrorWithdrawModal()
  const address = args?.address ?? null
  const tokenId = args?.tokenId ?? null

  const [{ step, hash }, setState] = useState<{ step: EvmMirrorWithdrawStep; hash: Hex | null }>({
    step: "amount",
    hash: null,
  })

  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)
  const account = useAccountByAddress(address)
  const balance = useBalance(address, tokenId)
  const tokenRates = useTokenRates(tokenId)
  const existentialDeposit = useExistentialDeposit(tokenId)

  const withdrawable = useMemo(() => findEvmMirrorWithdrawable(balance?.locks), [balance])
  const withdrawablePlancks = withdrawable?.amount ?? 0n
  const h160 = withdrawable?.h160 ?? null

  const setStep = useCallback((step: EvmMirrorWithdrawStep) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const form = useForm({
    defaultValues: { plancks: null } as FormData,
    onSubmit: () => setStep("confirm"),
    validators: {
      onChange: ({ value }) => (schema.safeParse(value).success ? null : "invalid"),
    },
  })
  const plancks = useStore(form.store, (state) => state.values.plancks)
  const setPlancks = useCallback(
    (plancks: bigint | null) => form.setFieldValue("plancks", plancks),
    [form]
  )

  // checked against live balances, which change between keystrokes: not a form validator
  const amountError = useMemo<InlineError | null>(() => {
    if (step === "submitted" || typeof plancks !== "bigint" || plancks <= 0n) return null
    if (plancks > withdrawablePlancks)
      return { message: t("Amount exceeds the EVM balance"), category: "insufficient_balance" }

    const remainder = withdrawablePlancks - plancks
    if (existentialDeposit && remainder > 0n && remainder < existentialDeposit.planck)
      return {
        message: t(
          "The EVM balance left would be below the existential deposit and lost. Use Max to withdraw everything."
        ),
        category: "input_invalid",
      }

    return null
  }, [step, plancks, withdrawablePlancks, existentialDeposit, t])

  const validPlancks = typeof plancks === "bigint" && plancks > 0n && !amountError ? plancks : null

  const { data: sapi } = useScaleApi(token?.networkId)

  // the fee does not depend on the amount: build with the full balance until a valid amount is set,
  // so the fee shows before the user types
  const payloadPlancks = validPlancks ?? (withdrawablePlancks > 0n ? withdrawablePlancks : null)

  const { data: payloadAndMetadata, error: errorPayload } = useSignerPayloadQuery({
    sapi,
    queryKey: [
      "getExtrinsicPayload",
      "EVM.withdraw",
      sapi?.id,
      address,
      h160,
      payloadPlancks?.toString(),
    ],
    queryFn: async () => {
      if (!sapi || !address || !h160 || !payloadPlancks) return null

      return sapi.getExtrinsicPayload(
        "EVM",
        "withdraw",
        { address: h160, value: payloadPlancks },
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

  const feeError = useMemo<InlineError | null>(() => {
    if (step === "submitted" || !balance || typeof feeEstimate !== "bigint") return null
    const transferable = balance.transferable.planck

    if (feeEstimate > transferable)
      return {
        message: t(
          "Not enough {{symbol}} in this account to pay the network fee. Only this account can withdraw its EVM balance.",
          { symbol: token?.symbol }
        ),
        category: "insufficient_fee",
      }

    if (existentialDeposit && existentialDeposit.planck + feeEstimate > transferable)
      return {
        message: t("Insufficient balance to cover fee and keep account alive"),
        category: "insufficient_fee",
      }

    return null
  }, [step, balance, feeEstimate, existentialDeposit, token?.symbol, t])

  const payloadErrorMessage = errorPayload ? t("Failed to build transaction") : null

  const canSubmit = !!validPlancks && !feeError && !errorPayload && !!payload

  const onSubmitted = useCallback(
    (hash: Hex) => {
      const report = valueReport({
        account,
        network,
        symbol: tokenSymbolForAnalytics(token),
        usd: validPlancks
          ? new BalanceFormatter(validPlancks, token?.decimals, tokenRates).fiat("usd")
          : null,
      })
      if (report) flows.evm_withdraw.submitted({ ...report, transactionId: hash })
      setState({ step: "submitted", hash })
    },
    [account, network, token, tokenRates, validPlancks]
  )

  useFlow(flows.evm_withdraw, {
    active: isOpen && !!args,
    step: step === "submitted" ? null : step,
  })

  useErrorShown({
    shown: amountError?.message,
    surface: "field",
    category: amountError?.category ?? "input_invalid",
    field: "amount",
  })
  useErrorShown({
    shown: feeError?.message,
    surface: "alert",
    category: feeError?.category ?? "insufficient_fee",
  })
  useErrorShown({
    shown: payloadErrorMessage,
    surface: "alert",
    category: classifyError(errorPayload),
  })

  return {
    form,
    step,
    hash,
    address,
    token,
    h160,
    withdrawablePlancks,
    plancks,
    validPlancks,
    setPlancks,
    errorMessage: amountError?.message ?? feeError?.message ?? payloadErrorMessage,
    canSubmit,
    payload: canSubmit ? payload : undefined,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    setStep,
    close,
    onSubmitted,
  }
}

export const [EvmMirrorWithdrawWizardProvider, useEvmMirrorWithdrawWizard] = provideContext(
  useEvmMirrorWithdrawWizardProvider
)
