import { ExtensionHandler } from "@core/libs/Handler"
import type { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { isAddressEqual } from "@talismn/crypto"
import { isAccountOwned } from "@talismn/keyring"

import { keyringStore } from "../keyring/store"
import { coreSwapEnv } from "./env.core"
import { swapPlanExecutor } from "./plans/executor"
import { fromPersistedLeg } from "./plans/helpers"
import { isTerminalPhase } from "./plans/machine"
import { applyPlanEvent, proposePlan, sweepPlans, takeProposalArrival } from "./plans/store"
import type { PlanLeg } from "./plans/types"
import { getPlanLegRuntime } from "./registry"
import type { NonEmpty } from "./types"

/**
 * The pages send the quote's legs, the summary and leg 0's nonce. The background looks the signers
 * up and computes every later leg's bound itself: a bound never comes from a page.
 */
const propose: MessageHandler<"pri(swaps.plan.propose)"> = async ({
  id,
  legs,
  summary,
  leg0Nonce,
}) => {
  const arrival = takeProposalArrival()
  if (legs.length < 2) throw new Error("A swap plan needs at least two legs")
  legs.slice(1).forEach((leg, index) => {
    if (!isAddressEqual(leg.signer, legs[index].recipient))
      throw new Error("The swap plan legs do not chain")
  })

  const planLegs = await Promise.all(
    legs.map(async (quote, index): Promise<PlanLeg> => {
      const runtime = getPlanLegRuntime(quote.protocol)
      const account = await keyringStore.getAccount(quote.signer)
      if (!account || !isAccountOwned(account))
        throw new Error("A swap plan leg must be signed by one of your accounts")
      const bound =
        index === 0
          ? null
          : await runtime.boundLeg(
              {
                leg: fromPersistedLeg(quote),
                slippage: summary.slippage,
                maxSpend: BigInt(legs[index - 1].outputAmount),
              },
              coreSwapEnv
            )
      return {
        quote,
        signerType: account.type,
        bound,
        ...(index === 0 ? { nonce: leg0Nonce } : {}),
        state: { at: "queued" },
      }
    })
  )

  const now = Date.now()
  await sweepPlans(now)
  await proposePlan({ id, legs: planLegs as NonEmpty<PlanLeg>, summary }, now, arrival)
  return true
}

/** true once the plan is over, false while its current leg already has a transaction */
const cancel: MessageHandler<"pri(swaps.plan.cancel)"> = async ({ id }) => {
  const result = await applyPlanEvent(id, { type: "cancelled" }, Date.now())
  if (!result) throw new Error("Unknown swap plan")
  swapPlanExecutor.driveQuietly(id)
  return isTerminalPhase(result.plan.phase)
}

export class SwapsHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    _id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    _port: chrome.runtime.Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(swaps.plan.propose)":
        return propose(
          request as RequestTypes["pri(swaps.plan.propose)"]
        ) as ResponseType<TMessageType>

      case "pri(swaps.plan.cancel)":
        return cancel(
          request as RequestTypes["pri(swaps.plan.cancel)"]
        ) as ResponseType<TMessageType>

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
