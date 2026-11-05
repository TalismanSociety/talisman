import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { settleTransitions } from "../../../../../../../tests/settleTransitions"

import {
  MnemonicDeleteModal,
  MnemonicDeleteModalProvider,
  useMnemonicDeleteModal,
} from "./MnemonicDeleteModal"

const mnemonic = vi.hoisted(() => ({ id: "mnemonic-1", name: "Test Phrase", confirmed: true }))
vi.mock("@ui/state/mnemonics", () => ({
  useMnemonics: () => [mnemonic],
  useMnemonic: (id?: string) => (id === mnemonic.id ? mnemonic : null),
}))

let modal: ReturnType<typeof useMnemonicDeleteModal>
const Driver = () => {
  modal = useMnemonicDeleteModal()
  return null
}

describe("MnemonicDeleteModal", () => {
  afterEach(cleanup)

  it("warns that deleting a phrase that was not backed up loses access to it", async () => {
    const { findByText } = render(
      <MnemonicDeleteModalProvider>
        <Driver />
        <MnemonicDeleteModal />
      </MnemonicDeleteModalProvider>
    )

    act(() => modal.open(mnemonic.id))
    await settleTransitions()

    expect(
      await findByText(
        "This action cannot be undone, if you have not backed up this phrase you will lose access to it"
      )
    ).toBeTruthy()
  })
})
