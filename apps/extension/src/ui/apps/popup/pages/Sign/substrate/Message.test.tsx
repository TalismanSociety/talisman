import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { stringToHex } from "viem"
import { describe, expect, it, vi } from "vitest"

const fx = vi.hoisted(() => ({ data: "" }))

vi.mock("@ui/domains/Sign/SignRequestContext", async () => {
  const { decodeSubstrateRawMessage, parseSubstrateSignInMessage } = await import(
    "@core/domains/signing/helpers"
  )
  const { useSignInDomainMismatch } = await import("@ui/domains/Sign/hooks/useSignInDomainMismatch")
  const url = "https://app.example.com/login"
  return {
    usePolkadotSigningRequest: () => {
      const text = decodeSubstrateRawMessage(fx.data)
      return {
        url,
        status: "PENDING",
        account: { address: ADDRESS, type: "keypair" },
        chain: null,
        request: { payload: { address: ADDRESS, data: fx.data, type: "bytes" } },
        siws: parseSubstrateSignInMessage(text),
        signInDomainMismatch: useSignInDomainMismatch(text, url),
      }
    },
  }
})

vi.mock("@ui/apps/popup/Layout/PopupLayout", () => {
  const Slot = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return { PopupLayout: Slot, PopupHeader: Slot, PopupContent: Slot, PopupFooter: Slot }
})
vi.mock("@ui/components/AppPill", () => ({ AppPill: () => null }))
vi.mock("@ui/domains/Account/AccountPill", () => ({ AccountPill: () => null }))
vi.mock("@ui/domains/Sign/Message", () => ({ Message: () => <div data-testid="raw-message" /> }))
vi.mock("../SignNetworkLogo", () => ({ SignNetworkLogo: () => null }))
vi.mock("./FooterContent", () => ({ FooterContent: () => null }))

import { PolkadotSignMessageRequest } from "./Message"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const siwsMessage = (domain: string) =>
  [
    `${domain} wants you to sign in with your Substrate account:`,
    ADDRESS,
    "",
    `URI: https://${domain}`,
    "Version: 1.0.0",
    "Nonce: abcdefgh12",
    "Issued At: 2024-01-01T00:00:00.000Z",
  ].join("\n")

const renderMessage = (message: string) => {
  fx.data = stringToHex(message)
  return render(<PolkadotSignMessageRequest />)
}

describe("PolkadotSignMessageRequest (sign-in domain)", () => {
  it("warns in the plain view about a sign-in for another domain the parser rejects", () => {
    const { container } = renderMessage(`${siwsMessage("evil.com")}\n`.replace("1.0.0", "1"))

    expect(screen.getByTestId("raw-message")).toBeDefined()
    expect(container.textContent).toContain("Sign in domain is different from website domain.")
  })

  it("warns on the sign-in screen about a sign-in for another domain", () => {
    const { container } = renderMessage(siwsMessage("evil.com"))

    expect(container.textContent).toContain("Sign In")
    expect(container.textContent).toContain("Sign in domain is different from website domain.")
  })

  it("does not warn about a plain message", () => {
    const { container } = renderMessage("evil.com is not a sign-in")

    expect(container.textContent).not.toContain("Sign in domain is different")
  })
})
