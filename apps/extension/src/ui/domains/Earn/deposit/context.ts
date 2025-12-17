import { Token } from "@talismn/chaindata-provider"
import { planckToTokens } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { uniq } from "lodash-es"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { notify } from "@talisman/components/Notifications"
import { provideContext } from "@talisman/util/provideContext"
import { useBalance, useNetworkById } from "@ui/state"
import { useYieldxyzProduct } from "@ui/state/yield"

import { useGetYieldxyzToken } from "../components/useGetYieldxyzToken"
import { UseYieldxyzTransactionProps } from "./types"
import { useEarnDepositModal } from "./useEarnDepositModal"
import { useYieldxyzEnterAction } from "./useYieldxyzEnterAction"
import { useYieldxyzTransaction } from "./useYieldxyzTransaction"

export type EarnDepositWizardInit = {
  address?: string
  tokenId?: string
  productId?: string
}

export type EarnDepositWizardState = {
  step: "product" | "account" | "validator" | "amount" | "confirm" | "follow-up"
  address: string | null
  productId: string | null
  validatorAddress: string | null // TODO remove, replace with generic "args"
  amountIn: bigint | null
}

const advanceStep = (state: EarnDepositWizardState): EarnDepositWizardState => {
  const selectStep = (state: EarnDepositWizardState) => {
    if (!state.productId) return "product"
    if (!state.address) return "account"
    return state.step
  }

  const step = selectStep(state)
  return { ...state, step }
}

const initializeState = (init: EarnDepositWizardInit | null): EarnDepositWizardState =>
  advanceStep({
    step: "amount",
    address: init?.address ?? null,
    productId: init?.productId ?? null,
    validatorAddress: null,
    amountIn: null,
  })

const useEarnDepositWizardProvider = ({ args }: { args: EarnDepositWizardInit | null }) => {
  const [state, setState] = useState<EarnDepositWizardState>(() => initializeState(args))
  const { status, data: product } = useYieldxyzProduct(state.productId)
  const { getYieldxyzToken } = useGetYieldxyzToken()

  const tokenIn = useMemo(() => {
    if (!product) return null
    const tokens = product.inputTokens.map(getYieldxyzToken)
    if (!tokens.length) return null
    if (tokens.some((t) => t === null)) return null
    if (uniq(tokens.map((t) => t!.id)).length > 1) {
      log.error("Product has multiple different input tokens, which is not supported", {
        productId: product.id,
        tokens,
      })
      return null
    }
    return tokens[0]!
  }, [product, getYieldxyzToken])

  const network = useNetworkById(tokenIn?.networkId)

  const balance = useBalance(state.address, tokenIn?.id)

  const amount = useMemo(() => {
    if (state.amountIn === null || !tokenIn) return null
    return planckToTokens(state.amountIn.toString(), tokenIn.decimals)
  }, [state.amountIn, tokenIn])

  const {
    canCreateAction,
    action, // ⚠️ action.transactions order changes over time, make sure to sort it based on stepIndex
    isLoading: isLoadingAction,
    error: errorAction,
    createAction,
    refreshAction,
    submitActionTransaction,
  } = useYieldxyzEnterAction({
    address: state.address,
    yieldId: state.productId,
    amount,
    validatorAddress: state.validatorAddress,
  })

  const onAmountInChanged = useCallback((amountIn: bigint | null) => {
    setState((state) => ({ ...state, amountIn }))
  }, [])

  const onAccountChanged = useCallback((address: string | null) => {
    setState((state) => advanceStep({ ...state, address, step: "amount" }))
  }, [])

  const goTo = useCallback((step: EarnDepositWizardState["step"]) => {
    setState((state) => ({ ...state, step }))
  }, [])

  const [stepIndex, setStepIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!action || typeof stepIndex === "number") return

    // initialize to first non-skipped transaction (ex: if approval is already done, it's a skip)
    const firstTx = action.transactions.find((tx) => tx.status !== "SKIPPED")
    setStepIndex(firstTx?.stepIndex ?? 0)
  }, [action, stepIndex])

  const txInputs = useMemo<UseYieldxyzTransactionProps | null>(() => {
    if (!action || !state.address || !network || stepIndex === null) return null
    const transactionDef = action.transactions[stepIndex] ?? null
    if (!transactionDef) return null
    return { address: state.address, networkId: network.id, transactionDef }
  }, [action, state.address, network, stepIndex])

  const transaction = useYieldxyzTransaction(txInputs)

  const { t } = useTranslation()
  const [pendingTxId, setPendingTxId] = useState<string | null>(null)
  const pendingTx = useMemo(
    () => action?.transactions.find((tx) => tx.id === pendingTxId) ?? null,
    [action, pendingTxId],
  )

  const onSubmit = useCallback(
    async (txId: string) => {
      if (stepIndex === null) return
      const transactionId = action?.transactions[stepIndex]?.id
      if (!transactionId) return
      await submitActionTransaction(transactionId, txId)
      setPendingTxId(transactionId)
    },
    [action, stepIndex, submitActionTransaction],
  )

  // TODO make its own hook
  useQuery({
    queryKey: ["yieldxyz", "follow-up", pendingTxId],
    enabled: ["BROADCASTED", "PENDING"].includes(pendingTx?.status ?? ""), // + check
    queryFn: async () => {
      if (!pendingTxId) return null
      await refreshAction()
      return null
    },
    refetchInterval: 2000,
  })

  useEffect(() => {
    if (!pendingTx?.status || ["BROADCASTED", "PENDING"].includes(pendingTx.status ?? "")) return

    switch (pendingTx.status) {
      case "CONFIRMED":
        notify({
          type: "success",
          title: t("Success"),
          subtitle: t("Transaction confirmed"),
        })
        setPendingTxId(null)
        setStepIndex((index) => (index ?? 0) + 1)
        break
      case "BLOCKED":
      case "NOT_FOUND":
      case "FAILED":
        notify({
          type: "error",
          title: t("Error"),
          subtitle: t("Transaction failed"),
        })
        setPendingTxId(null)
        break

      default:
        log.warn("Unhandled pendingTx status in EarnDepositWizard", { status: pendingTx.status })
        break
    }
  }, [pendingTx?.status, refreshAction, t])

  const { close, isOpen } = useEarnDepositModal()
  useEffect(() => {
    if (isOpen && action?.transactions.every((tx) => ["CONFIRMED", "SKIPPED"].includes(tx.status)))
      close()
  }, [action, close, isOpen])

  useEffect(() => {
    log.debug("useEarnDepositWizard state changed", {
      ...state,
      tokenIn,
      product,
      action,
      isLoadingAction,
      errorAction,
      transaction,
    })
  }, [state, tokenIn, product, action, isLoadingAction, errorAction, transaction])

  return {
    ...state,
    tokenIn,
    network,
    balance,
    product,
    goTo,
    onAmountInChanged,
    onAccountChanged,
    onSubmit,
    isLoadingProduct: status === "loading" && !product,
    isLoadingAction,
    action,
    errorAction,
    txIndex: stepIndex,
    transaction,
    pendingTx,
    nativeToken: null as Token | null, // TODO
    estimatedFeeTotal: null as bigint | null, // TODO
    canCreateAction,
    createAction,
  }
}

export const [EarnDepositWizardProvider, useEarnDepositWizard] = provideContext(
  useEarnDepositWizardProvider,
)
