import { classifyError } from "@common/analytics/errorCategory"
import { describe, expect, it } from "vitest"

import PortMessageService from "./PortMessageService"

const rejectionOf = (data: Record<string, unknown>) => {
  const service = new PortMessageService()
  return new Promise<unknown>((resolve) => {
    service.handlers["1"] = { message: "pri(app.checkPassword)", resolve, reject: resolve }
    service.handleResponse({ id: "1", ...data } as never)
  })
}

describe("PortMessageService", () => {
  it("keeps the background's verdict on the rebuilt error, with the message unchanged", async () => {
    const error = await rejectionOf({ error: "Something odd", errorCategory: "nonce_conflict" })

    expect(error).toEqual(new Error("Something odd"))
    expect(classifyError(error)).toBe("nonce_conflict")
  })

  it("ignores a category it does not know", async () => {
    const error = await rejectionOf({ error: "Something odd", errorCategory: "made_up" })

    expect(classifyError(error)).toBe("unknown")
  })
})
