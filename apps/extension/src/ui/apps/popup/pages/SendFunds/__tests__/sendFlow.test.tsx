import { cleanup, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const trackFlowEvent = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track: vi.fn(), trackFlowEvent }))
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

const started = () =>
  trackFlowEvent.mock.calls.filter(([event]) => event === "send_started").map(([, props]) => props)

describe("send flow binding", () => {
  beforeEach(() => trackFlowEvent.mockClear())
  afterEach(cleanup)

  it("starts with the entry the opener put in the window's URL", () => {
    openSend("entry=token_details&tokenId=1%3Aevm-native")

    expect(started()).toEqual([expect.objectContaining({ entry: "token_details" })])
    expect(wizard.recipientSource).toBe("unknown")
  })

  it("reads an unknown or missing entry as unknown, and an opener's recipient as prefilled", () => {
    openSend("entry=somewhere&to=0x1111111111111111111111111111111111111111")

    expect(started()).toEqual([expect.objectContaining({ entry: "unknown" })])
    expect(wizard.recipientSource).toBe("prefilled")
  })
})
