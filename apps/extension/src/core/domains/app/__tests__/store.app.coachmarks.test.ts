import { beforeEach, describe, expect, test } from "vitest"

const { appStore } = await import("../store.app")

describe("coachmarks that announce a change", () => {
  beforeEach(async () => {
    await chrome.storage.local.clear()
  })

  test("are already dismissed on a fresh install", async () => {
    await appStore.init()

    expect(await appStore.get("dismissedCoachmarks")).toContain("popup_fullscreen_moved")
  })

  test("still show to a wallet that was onboarded before the update", async () => {
    await chrome.storage.local.set({ app: { onboarded: "TRUE" } })

    await appStore.init()

    expect(await appStore.get("dismissedCoachmarks")).toBeUndefined()
  })
})
