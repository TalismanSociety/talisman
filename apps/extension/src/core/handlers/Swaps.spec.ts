import { db } from "@core/db"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { keyringStore } from "../domains/keyring/store"
import { SwapsHandler } from "../domains/swaps/handler"
import { BOUND, LEG0, LEG1, PLAN_ID, SUMMARY } from "../domains/swaps/plans/__tests__/fixtures"
import type { SwapPlanId } from "../domains/swaps/plans/types"
import { getBackgroundSwapModule } from "../domains/swaps/registry"
import { extensionStores } from "./stores"

vi.mock("../domains/swaps/registry", () => ({ getBackgroundSwapModule: vi.fn() }))

const handler = new SwapsHandler(extensionStores)
const propose = (id: SwapPlanId, leg0Nonce: number) =>
  handler.handle(
    "id",
    "pri(swaps.plan.propose)",
    { id, legs: [LEG0.quote, LEG1.quote], summary: SUMMARY, leg0Nonce },
    {} as chrome.runtime.Port
  )

describe("pri(swaps.plan.propose)", () => {
  beforeEach(async () => {
    await db.swapPlans.clear()
    vi.spyOn(keyringStore, "getAccount").mockResolvedValue({ type: "keypair" } as never)
  })

  it("never changes the legs of a proposed plan", async () => {
    vi.mocked(getBackgroundSwapModule).mockReturnValue({ boundLeg: async () => BOUND } as never)
    await propose(PLAN_ID, 7)
    await expect(propose(PLAN_ID, 8)).rejects.toThrow("The swap was already proposed")
    expect((await db.swapPlans.get(PLAN_ID))?.legs[0].nonce).toBe(7)
  })
})
