import { cleanup, fireEvent, render } from "@testing-library/react"
import { Drawer } from "@ui/components/Drawer"
import { Modal } from "@ui/components/Modal"
import { afterEach, describe, expect, it, vi } from "vitest"

const pressEscape = () => fireEvent.keyDown(window, { key: "Escape" })

describe("useDismissOnEscape", () => {
  afterEach(cleanup)

  it("dismisses an open modal", () => {
    const onDismiss = vi.fn()
    render(
      <Modal isOpen onDismiss={onDismiss}>
        modal
      </Modal>
    )

    pressEscape()

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it("ignores closed modals and other keys", () => {
    const onDismiss = vi.fn()
    render(
      <Modal isOpen={false} onDismiss={onDismiss}>
        modal
      </Modal>
    )
    pressEscape()

    cleanup()
    render(
      <Modal isOpen onDismiss={onDismiss}>
        modal
      </Modal>
    )
    fireEvent.keyDown(window, { key: "Enter" })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it("dismisses the drawer above a modal first, then the modal", () => {
    const onDismissModal = vi.fn()
    const onDismissDrawer = vi.fn()
    const { rerender } = render(
      <Modal isOpen onDismiss={onDismissModal}>
        modal
      </Modal>
    )
    rerender(
      <Modal isOpen onDismiss={onDismissModal}>
        <Drawer anchor="bottom" isOpen onDismiss={onDismissDrawer}>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()
    expect(onDismissDrawer).toHaveBeenCalledOnce()
    expect(onDismissModal).not.toHaveBeenCalled()

    rerender(
      <Modal isOpen onDismiss={onDismissModal}>
        <Drawer anchor="bottom" isOpen={false} onDismiss={onDismissDrawer}>
          drawer
        </Drawer>
      </Modal>
    )
    pressEscape()
    expect(onDismissModal).toHaveBeenCalledOnce()
    expect(onDismissDrawer).toHaveBeenCalledOnce()
  })

  it("dismisses a drawer that opens in the same render as its modal first", () => {
    const onDismissModal = vi.fn()
    const onDismissDrawer = vi.fn()
    render(
      <Modal isOpen onDismiss={onDismissModal}>
        <Drawer anchor="bottom" isOpen onDismiss={onDismissDrawer}>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()

    expect(onDismissDrawer).toHaveBeenCalledOnce()
    expect(onDismissModal).not.toHaveBeenCalled()
  })

  it("does not reach the modal beneath a layer that cannot be dismissed", () => {
    const onDismissModal = vi.fn()
    const { rerender } = render(
      <Modal isOpen onDismiss={onDismissModal}>
        modal
      </Modal>
    )
    rerender(
      <Modal isOpen onDismiss={onDismissModal}>
        <Drawer anchor="bottom" isOpen>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()

    expect(onDismissModal).not.toHaveBeenCalled()
  })

  it("keeps the open order when the modal beneath re-renders with a new callback", () => {
    const onDismissModal = vi.fn()
    const onDismissDrawer = vi.fn()
    const { rerender } = render(
      <Modal isOpen onDismiss={() => onDismissModal()}>
        modal
      </Modal>
    )
    rerender(
      <Modal isOpen onDismiss={() => onDismissModal()}>
        <Drawer anchor="bottom" isOpen onDismiss={onDismissDrawer}>
          drawer
        </Drawer>
      </Modal>
    )

    pressEscape()

    expect(onDismissDrawer).toHaveBeenCalledOnce()
    expect(onDismissModal).not.toHaveBeenCalled()
  })

  it("leaves an Escape handled by an inner element alone", () => {
    const onDismiss = vi.fn()
    render(
      <Modal isOpen onDismiss={onDismiss}>
        modal
      </Modal>
    )

    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
    event.preventDefault()
    window.dispatchEvent(event)

    expect(onDismiss).not.toHaveBeenCalled()
  })
})
