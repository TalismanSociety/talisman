import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MnemonicCreateModal, MnemonicCreateModalProvider, useMnemonicCreateModal } from "."
import { Stages } from "./context"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))
vi.mock("@talismn/icons", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/icons")>()),
  ShieldSuccessIcon: () => null,
  XIcon: () => null,
}))

const closes = () =>
  track.mock.calls
    .filter(([event]) => event === "modal_closed")
    .map(([, props]) => [props.modal_id, props.dismiss])

let wizard: ReturnType<typeof useMnemonicCreateModal>
const Driver = () => {
  wizard = useMnemonicCreateModal()
  return null
}

describe("MnemonicCreateModal", () => {
  afterEach(cleanup)

  it("closes completed when the user finishes the wizard", async () => {
    const { findByText } = render(
      <MnemonicCreateModalProvider>
        <Driver />
        <MnemonicCreateModal />
      </MnemonicCreateModalProvider>
    )

    let generated: ReturnType<typeof wizard.generateMnemonic> | undefined
    act(() => {
      generated = wizard.generateMnemonic()
      wizard.setStage(Stages.Complete)
    })
    fireEvent.click(await findByText("Done"))

    await expect(generated).resolves.toEqual({ mnemonic: expect.any(String), confirmed: false })
    await waitFor(() => expect(closes()).toEqual([["mnemonic_create", "completed"]]))
  })
})
