import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useSignInDomainMismatch } from "./hooks/useSignInDomainMismatch"
import { SignInDomainMismatchAlert } from "./SignInDomainMismatchAlert"

const SignInScreen = ({ signInDomain }: { signInDomain: string | undefined }) => {
  const mismatch = useSignInDomainMismatch(signInDomain, "http://localhost:5600/vault")
  return (
    <>
      <SignInDomainMismatchAlert mismatch={mismatch} />
      <button type="button" disabled={mismatch.isBlocking}>
        Sign
      </button>
    </>
  )
}

describe("SignInDomainMismatchAlert", () => {
  it("blocks signing a foreign domain until the risk is acknowledged", () => {
    render(<SignInScreen signInDomain="app.orbinum.network" />)

    expect(screen.getByText("Sign in domain is different from website domain.")).toBeDefined()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(true)

    fireEvent.click(screen.getByRole("checkbox"))

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(false)
  })

  it("shows nothing and blocks nothing for the requesting site or a plain message", () => {
    const { rerender } = render(<SignInScreen signInDomain="localhost:5600" />)
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(false)

    rerender(<SignInScreen signInDomain={undefined} />)
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(false)
  })
})
