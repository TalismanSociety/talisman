import { PORT_CONTENT, PORT_EXTENSION } from "@common/constants"
import { waitFor } from "@testing-library/dom"
import { describe, expect, it, vi } from "vitest"

import talismanHandler from "."

const fakePort = (name: string) => ({
  name,
  sender: { url: name === PORT_CONTENT ? "https://app.example.com/" : undefined },
  postMessage: vi.fn(),
  disconnect: vi.fn(),
  onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
  onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
})

describe("talismanHandler errors", () => {
  it("posts the classified category beside the message to extension pages", async () => {
    const port = fakePort(PORT_EXTENSION)
    talismanHandler(
      {
        id: "1",
        message: "pri(app.checkPassword)",
        origin: "talisman-extension",
        request: { password: "nope" },
      },
      port as unknown as chrome.runtime.Port
    )

    await waitFor(() => expect(port.postMessage).toHaveBeenCalled())
    expect(port.postMessage).toHaveBeenCalledWith({
      id: "1",
      error: "Unauthorised",
      errorCategory: "wrong_password",
    })
  })

  it("posts dapp pages exactly what they got before: no category", async () => {
    const port = fakePort(PORT_CONTENT)
    talismanHandler(
      { id: "2", message: "pub(nope)", origin: "talisman-page", request: null } as never,
      port as unknown as chrome.runtime.Port
    )

    await waitFor(() => expect(port.postMessage).toHaveBeenCalled())
    expect(port.postMessage.mock.calls[0]?.[0]).not.toHaveProperty("errorCategory")
  })
})
