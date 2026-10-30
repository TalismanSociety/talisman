import { db } from "@core/db"
import type { LegBound } from "@core/domains/swaps/types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { keyringStore } from "../domains/keyring/store"
import { SwapsHandler } from "../domains/swaps/handler"
import { BOUND, LEG0, LEG1, PLAN_ID, SUMMARY, T0 } from "../domains/swaps/plans/__tests__/fixtures"
import type { SwapPlanId } from "../domains/swaps/plans/types"
import { getPlanLegRuntime } from "../domains/swaps/registry"
import { extensionStores } from "./stores"

vi.mock("../domains/swaps/registry", () => ({
  getBackgroundSwapModule: vi.fn(),
  getPlanLegRuntime: vi.fn(),
}))

const NEWER_ID = "plan-2" as SwapPlanId

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
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(T0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    ["in the same millisecond", 0],
    ["on a clock that went back", -5],
  ])(
    "keeps the newer proposal when an older one finishes its bounds last, %s",
    async (_, clockStep) => {
      let releaseOlder = () => {}
      const olderBound = new Promise<LegBound>((resolve) => {
        releaseOlder = () => resolve(BOUND)
      })
      vi.mocked(getPlanLegRuntime)
        .mockReturnValueOnce({} as never)
        .mockReturnValueOnce({ boundLeg: () => olderBound } as never)
        .mockReturnValueOnce({} as never)
        .mockReturnValueOnce({ boundLeg: async () => BOUND } as never)

      const older = propose(PLAN_ID, 7)
      await vi.waitFor(() => expect(getPlanLegRuntime).toHaveBeenCalledTimes(2))
      vi.setSystemTime(T0 + clockStep)
      await propose(NEWER_ID, 8)
      releaseOlder()

      await expect(older).rejects.toThrow("A newer swap is using that account")
      expect(await db.swapPlans.get(NEWER_ID)).toMatchObject({
        phase: "proposed",
        legs: [{ nonce: 8 }, {}],
      })
      expect(await db.swapPlans.get(PLAN_ID)).toBeUndefined()
    }
  )

  it("never changes the legs of a proposed plan", async () => {
    vi.mocked(getPlanLegRuntime).mockReturnValue({ boundLeg: async () => BOUND } as never)
    await propose(PLAN_ID, 7)
    await expect(propose(PLAN_ID, 8)).rejects.toThrow("The swap was already proposed")
    expect((await db.swapPlans.get(PLAN_ID))?.legs[0].nonce).toBe(7)
  })
})
