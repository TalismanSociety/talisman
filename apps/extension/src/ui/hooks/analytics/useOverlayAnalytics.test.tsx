import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { Drawer } from "@ui/components/Drawer"
import { Modal } from "@ui/components/Modal"
import { type ReactNode, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { resolveDismiss, useMarkOverlayCompleted } from "./useOverlayAnalytics"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

const closes = () =>
  track.mock.calls
    .filter(([event]) => event === "modal_closed")
    .map(([, props]) => [props.modal_id, props.dismiss])

const opens = () =>
  track.mock.calls.filter(([event]) => event === "modal_opened").map(([, props]) => props.modal_id)

const pressEscape = () => fireEvent.keyDown(window, { key: "Escape" })
const clickBackdrop = () => {
  const backdrop = document.querySelector<HTMLElement>(".backdrop-blur-xs")
  if (!backdrop) throw new Error("no backdrop")
  fireEvent.click(backdrop)
}
const nextMacrotask = () => act(() => new Promise((resolve) => setTimeout(resolve)))

const Submit = ({ onDone }: { onDone: () => void }) => {
  const markCompleted = useMarkOverlayCompleted()
  return (
    <button
      type="button"
      onClick={() => {
        markCompleted()
        onDone()
      }}
    >
      submit
    </button>
  )
}

const Harness = ({
  children,
  dismissStepsBack = false,
}: {
  children?: (close: () => void) => ReactNode
  dismissStepsBack?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const [step, setStep] = useState(1)
  const close = () => setIsOpen(false)
  return (
    <Modal
      analyticsId="harness"
      isOpen={isOpen}
      onDismiss={dismissStepsBack && step > 0 ? () => setStep(step - 1) : close}
    >
      <button type="button" onClick={close}>
        close
      </button>
      {children?.(close)}
    </Modal>
  )
}

describe("resolveDismiss", () => {
  it.each([
    [{ completed: true, gesture: "escape", parentCause: "button" }, "completed"],
    [{ completed: false, gesture: "backdrop", parentCause: "completed" }, "backdrop"],
    [{ completed: false, gesture: null, parentCause: "escape" }, "escape"],
    [{ completed: false, gesture: null, parentCause: null }, "button"],
  ] as const)("%j -> %s", (input, dismiss) => {
    expect(resolveDismiss(input)).toBe(dismiss)
  })
})

describe("modal_opened and modal_closed", () => {
  beforeEach(() => track.mockClear())
  afterEach(cleanup)

  it("opens once and closes by escape", async () => {
    render(<Harness />)
    pressEscape()

    await waitFor(() => expect(closes()).toEqual([["harness", "escape"]]))
    expect(opens()).toEqual(["harness"])
    expect(track).toHaveBeenLastCalledWith("modal_closed", {
      modal_id: "harness",
      dismiss: "escape",
      duration_ms: expect.any(Number),
    })
  })

  it("closes by backdrop", async () => {
    render(<Harness />)
    clickBackdrop()

    await waitFor(() => expect(closes()).toEqual([["harness", "backdrop"]]))
  })

  it("closes by its own button", async () => {
    const { getByText } = render(<Harness />)
    fireEvent.click(getByText("close"))

    await waitFor(() => expect(closes()).toEqual([["harness", "button"]]))
  })

  it("closes completed when what it was for finished inside it", async () => {
    const { getByText } = render(<Harness>{(close) => <Submit onDone={close} />}</Harness>)
    fireEvent.click(getByText("submit"))

    await waitFor(() => expect(closes()).toEqual([["harness", "completed"]]))
  })

  it("forgets an escape that stepped back instead of closing", async () => {
    const { getByText } = render(<Harness dismissStepsBack />)
    pressEscape()
    await nextMacrotask()
    fireEvent.click(getByText("close"))

    await waitFor(() => expect(closes()).toEqual([["harness", "button"]]))
  })

  it("closes a nested overlay with its parent's cause when it unmounts with it", async () => {
    render(
      <Harness>
        {() => (
          <Drawer analyticsId="nested" anchor="bottom" isOpen>
            drawer
          </Drawer>
        )}
      </Harness>
    )
    clickBackdrop()

    await waitFor(() =>
      expect(closes()).toEqual([
        ["harness", "backdrop"],
        ["nested", "backdrop"],
      ])
    )
  })

  it("closes an overlay mounted only while open when it unmounts", async () => {
    const Conditional = () => {
      const [shown, setShown] = useState(true)
      return shown ? (
        <Modal analyticsId="conditional" isOpen onDismiss={() => setShown(false)}>
          modal
        </Modal>
      ) : null
    }
    render(<Conditional />)
    pressEscape()

    await waitFor(() => expect(closes()).toEqual([["conditional", "escape"]]))
  })

  it("sends nothing for an overlay that never opened", async () => {
    render(
      <Modal analyticsId="closed" isOpen={false}>
        modal
      </Modal>
    )
    await nextMacrotask()

    expect(track).not.toHaveBeenCalled()
  })
})
