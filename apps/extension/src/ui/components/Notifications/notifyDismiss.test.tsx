import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "react-toastify"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NotificationsContainer } from "./NotificationsContainer"
import { notify, notifyUpdate } from "./notify"

vi.mock("@ui/api/track", () => ({ track: vi.fn() }))

const showToast = async (...args: Parameters<typeof notify>) => {
  render(<NotificationsContainer />)
  const toastId = await act(async () => notify(...args))
  await screen.findByText("Password changed")
  return toastId
}

describe("clicking a toast", () => {
  afterEach(() => act(() => toast.dismiss()))

  it("dismisses it", async () => {
    const toastId = await showToast({ type: "success", title: "Password changed" })

    fireEvent.click(screen.getByText("Password changed"))

    await waitFor(() => expect(toast.isActive(toastId)).toBe(false))
  })

  it("keeps it up when the caller opts out, still running the caller's click handler", async () => {
    const onClick = vi.fn()
    const toastId = await showToast(
      { type: "success", title: "Password changed" },
      { onClick, closeOnClick: false }
    )

    fireEvent.click(screen.getByText("Password changed"))

    expect(onClick).toHaveBeenCalledOnce()
    expect(toast.isActive(toastId)).toBe(true)
  })

  it("still shows the outcome of a processing toast dismissed early", async () => {
    render(<NotificationsContainer />)
    const toastId = await act(async () =>
      notify({ type: "processing", title: "Adding" }, { autoClose: false })
    )
    fireEvent.click(await screen.findByText("Adding"))
    await waitFor(() => expect(toast.isActive(toastId)).toBe(false))

    await act(() => notifyUpdate(toastId, { type: "success", title: "Added" }))

    expect(await screen.findByText("Added")).toBeTruthy()
  })

  it("still runs a button inside the toast", async () => {
    const onButtonClick = vi.fn()
    await showToast({
      type: "success",
      title: "Password changed",
      right: <button type="button" onClick={onButtonClick} aria-label="Show QR" />,
    })

    fireEvent.click(screen.getByRole("button", { name: "Show QR" }))

    expect(onButtonClick).toHaveBeenCalledOnce()
  })
})
