import { describe, expect, it } from "vitest"

import { getTestScaleApi } from "../__fixtures__/chains"
import { getCallDocs } from "./getCallDocs"

const { chain } = getTestScaleApi("polkadot")

describe("getCallDocs", () => {
  it("joins the call's doc lines", () => {
    expect(getCallDocs(chain, "System", "remark")).toBe(
      "Make some on-chain remark.\n\nCan be executed by every `origin`."
    )
  })

  it("returns null for an unknown call of a known pallet", () => {
    expect(getCallDocs(chain, "System", "not_a_call")).toBeNull()
  })

  it("returns null for a pallet without calls", () => {
    expect(getCallDocs(chain, "Authorship", "anything")).toBeNull()
  })

  it("returns null for an unknown pallet", () => {
    expect(getCallDocs(chain, "NotAPallet", "remark")).toBeNull()
  })
})
