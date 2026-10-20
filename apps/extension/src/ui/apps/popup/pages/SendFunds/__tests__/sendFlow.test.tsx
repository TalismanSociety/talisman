import { cleanup, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@ui/state/chaindata", () => ({ useTokensMap: () => ({}) }))

import { SendFundsWizardProvider, useSendFundsWizard } from "../context"

let wizard: ReturnType<typeof useSendFundsWizard>
const Probe = () => {
  wizard = useSendFundsWizard()
  return null
}

const openSend = (query: string) =>
  render(
    <MemoryRouter initialEntries={[`/send/token?${query}`]}>
      <SendFundsWizardProvider>
        <Probe />
      </SendFundsWizardProvider>
    </MemoryRouter>
  )

describe("send wizard", () => {
  afterEach(cleanup)

  it("reads the entry the opener put in the window's URL", () => {
    openSend("entry=token_details&tokenId=1%3Aevm-native")

    expect(wizard.entry).toBe("token_details")
    expect(wizard.recipientSource).toBe("unknown")
  })

  it("reads an unknown or missing entry as unknown, and an opener's recipient as prefilled", () => {
    openSend("entry=somewhere&to=0x1111111111111111111111111111111111111111")

    expect(wizard.entry).toBe("unknown")
    expect(wizard.recipientSource).toBe("prefilled")
  })
})
