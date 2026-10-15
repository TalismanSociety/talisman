import { describe, expect, it } from "vitest"

import { redactForPrint } from "./api"

describe("redactForPrint", () => {
  it("hides the project token and the Discord webhook at any depth", () => {
    expect(
      redactForPrint({
        api_key: "phc_x",
        batch: [{ event: "a" }],
        inputs: { webhookUrl: { value: "https://discord.com/api/webhooks/1" } },
      })
    ).toEqual({
      api_key: "<redacted>",
      batch: [{ event: "a" }],
      inputs: { webhookUrl: "<redacted>" },
    })
  })
})
