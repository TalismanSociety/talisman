import { act, fireEvent, render, screen } from "@testing-library/react"
import { NotificationsContainer } from "@ui/components/Notifications/NotificationsContainer"
import { useEffect } from "react"
import { toast } from "react-toastify"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SwapTxNotifications } from "./SwapTxNotifications"
import { SwapTxWatcherProvider, useSwapTxWatcher } from "./SwapTxWatcher"

const HASH = "0xabc"

vi.mock("@ui/state/transactions", () => ({
  useTransaction: () => ({ status: "pending", confirmed: false }),
}))
vi.mock("@ui/state/chaindata", () => ({ useNetworkById: () => undefined }))
vi.mock("@talismn/chaindata-provider", async (original) => ({
  ...(await original<object>()),
  getBlockExplorerUrl: () => "https://explorer.test/tx",
}))

const WatchSwap = () => {
  const { addTransaction } = useSwapTxWatcher()
  useEffect(() => addTransaction({ hash: HASH, label: "Swap" }), [addTransaction])
  return null
}

const showSwapToast = async () => {
  render(
    <SwapTxWatcherProvider>
      <NotificationsContainer />
      <WatchSwap />
      <SwapTxNotifications />
    </SwapTxWatcherProvider>
  )
  await screen.findByText("Swap")
}

describe("clicking a pending swap toast", () => {
  afterEach(() => act(() => toast.dismiss()))

  it("opens the explorer and keeps tracking the swap", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null)
    await showSwapToast()

    fireEvent.click(screen.getByText("Swap"))

    expect(open).toHaveBeenCalledWith("https://explorer.test/tx", "_blank")
    expect(toast.isActive(HASH)).toBe(true)
  })
})
