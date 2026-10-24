import { deriveLegInput, fromPersistedLeg } from "@core/domains/swaps/plans/helpers"
import type { SwapPlan } from "@core/domains/swaps/plans/types"
import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import { skipToken, useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSubmitButton"
import type { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { getEvmPublicClient } from "../swap-modules/evm-network"
import { swapModules } from "../swaps.api"

const buildHardwareLegTransaction = async (
  plan: SwapPlan,
  index: number
): Promise<TxSubmitButtonTransaction> => {
  const leg = plan.legs[index]
  const module = swapModules.find((candidate) => candidate.protocol === leg.quote.protocol)
  if (!module) throw new Error("This swap provider is unavailable")

  const networkId = networkIdFromTokenId(leg.quote.fromTokenId)
  const signer = leg.quote.signer as Hex
  const client = await getEvmPublicClient(networkId)
  const [balance, nextNonce] = await Promise.all([
    client.getBalance({ address: signer }),
    leg.nonce ?? api.ethGetTransactionsCount(signer, networkId),
  ])
  const built = await module.buildLeg({
    leg: fromPersistedLeg(leg.quote),
    input: deriveLegInput(plan, index, balance),
    context: { platform: "ethereum" },
    exchange: null,
    slippage: plan.summary.slippage,
  })
  if (built.transaction.platform !== "ethereum")
    throw new Error("Only an EVM leg is signed on a Ledger")

  const { to, data, value, gas, maxFeePerGas, maxPriorityFeePerGas } = built.transaction.transaction
  return {
    platform: "ethereum",
    networkId,
    payload: {
      type: "eip1559",
      from: signer,
      to,
      data,
      value,
      gas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: nextNonce,
    },
    txInfo: { ...built.txInfo, plan: { id: plan.id, leg: index } },
  }
}

/**
 * A hardware signer's leg is built here, on what the previous leg landed, and signed on the device.
 * The signed bytes go to the background, which admits them against the leg's bound before sending.
 * Every sign attempt that ends rebuilds it, so a retry never reuses a nonce another transaction took.
 */
export const useHardwareLegTransaction = (
  plan: SwapPlan | null | undefined,
  index: number | null
) =>
  useQuery({
    queryKey: ["swap-plan-hardware-leg", plan?.id, index, plan?.updatedAt],
    queryFn: plan && index !== null ? () => buildHardwareLegTransaction(plan, index) : skipToken,
    retry: false,
  })

export const SwapPlanLedgerSign: FC<{
  tx: TxSubmitButtonTransaction | undefined
  onSignAttemptEnded: () => void
  containerId?: string
}> = ({ tx, onSignAttemptEnded, containerId }) => {
  const { t } = useTranslation()

  return (
    <TxSubmitButton
      containerId={containerId}
      tx={tx}
      label={t("Sign on Ledger")}
      onSubmit={() => {}}
      onPayloadLockChange={(isLocked) => {
        if (!isLocked) onSignAttemptEnded()
      }}
      disabled={!tx}
    />
  )
}
