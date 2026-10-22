import { cleanup, fireEvent, render } from "@testing-library/react"
import { Drawer } from "@ui/components/Drawer"
import { Modal } from "@ui/components/Modal"
import { afterEach, describe, expect, it, vi } from "vitest"
import { settleTransitions } from "../../../tests/settleTransitions"

const pressEscape = () => fireEvent.keyDown(window, { key: "Escape" })

describe("useDismissOnEscape", () => {
  afterEach(cleanup)

  it("dismisses an open modal", async () => {
    const onDismiss = vi.fn()
    render(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismiss}>
        modal
      </Modal>
    )

    pressEscape()

    expect(onDismiss).toHaveBeenCalledOnce()

    await settleTransitions()
  })

  it("ignores closed modals and other keys", async () => {
    const onDismiss = vi.fn()
    render(
      <Modal analyticsId="test_modal" isOpen={false} onDismiss={onDismiss}>
        modal
      </Modal>
    )
    pressEscape()

    cleanup()
    render(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismiss}>
        modal
      </Modal>
    )
    fireEvent.keyDown(window, { key: "Enter" })

    expect(onDismiss).not.toHaveBeenCalled()

    await settleTransitions()
  })

  it("dismisses the drawer above a modal first, then the modal", async () => {
    const onDismissModal = vi.fn()
    const onDismissDrawer = vi.fn()
    const { rerender } = render(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismissModal}>
        modal
      </Modal>
    )
    rerender(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismissModal}>
        <Drawer analyticsId="test_drawer" anchor="bottom" isOpen onDismiss={onDismissDrawer}>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()
    expect(onDismissDrawer).toHaveBeenCalledOnce()
    expect(onDismissModal).not.toHaveBeenCalled()

    rerender(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismissModal}>
        <Drawer
          analyticsId="test_drawer"
          anchor="bottom"
          isOpen={false}
          onDismiss={onDismissDrawer}
        >
          drawer
        </Drawer>
      </Modal>
    )
    pressEscape()
    expect(onDismissModal).toHaveBeenCalledOnce()
    expect(onDismissDrawer).toHaveBeenCalledOnce()

    await settleTransitions()
  })

  it("dismisses a drawer that opens in the same render as its modal first", async () => {
    const onDismissModal = vi.fn()
    const onDismissDrawer = vi.fn()
    render(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismissModal}>
        <Drawer analyticsId="test_drawer" anchor="bottom" isOpen onDismiss={onDismissDrawer}>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()

    expect(onDismissDrawer).toHaveBeenCalledOnce()
    expect(onDismissModal).not.toHaveBeenCalled()

    await settleTransitions()
  })

  it("does not reach the modal beneath a layer that cannot be dismissed", async () => {
    const onDismissModal = vi.fn()
    const { rerender } = render(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismissModal}>
        modal
      </Modal>
    )
    rerender(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismissModal}>
        <Drawer analyticsId="test_drawer" anchor="bottom" isOpen>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()

    expect(onDismissModal).not.toHaveBeenCalled()

    await settleTransitions()
  })

  it("keeps the open order when the modal beneath re-renders with a new callback", async () => {
    const onDismissModal = vi.fn()
    const onDismissDrawer = vi.fn()
    const { rerender } = render(
      <Modal analyticsId="test_modal" isOpen onDismiss={() => onDismissModal()}>
        modal
      </Modal>
    )
    rerender(
      <Modal analyticsId="test_modal" isOpen onDismiss={() => onDismissModal()}>
        <Drawer analyticsId="test_drawer" anchor="bottom" isOpen onDismiss={onDismissDrawer}>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()

    expect(onDismissDrawer).toHaveBeenCalledOnce()
    expect(onDismissModal).not.toHaveBeenCalled()

    await settleTransitions()
  })

  it("leaves an Escape handled by an inner element alone", async () => {
    const onDismiss = vi.fn()
    render(
      <Modal analyticsId="test_modal" isOpen onDismiss={onDismiss}>
        modal
      </Modal>
    )

    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
    event.preventDefault()
    window.dispatchEvent(event)

    expect(onDismiss).not.toHaveBeenCalled()

    await settleTransitions()
  })
})
