import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SignAlertMessage } from "./SignAlertMessage"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

describe("SignAlertMessage", () => {
  it("reports an error alert with its category, and no warning about what the request does", () => {
    render(
      <>
        <SignAlertMessage type="error" errorCategory="insufficient_balance">
          Insufficient ETH balance
        </SignAlertMessage>
        <SignAlertMessage type="error" errorCategory={null}>
          This contract will be able to spend all your tokens
        </SignAlertMessage>
        <SignAlertMessage>Talisman can't read what this transaction does</SignAlertMessage>
      </>
    )

    expect(track.mock.calls).toEqual([
      ["error_shown", { surface: "alert", error_category: "insufficient_balance" }],
    ])
  })
})
