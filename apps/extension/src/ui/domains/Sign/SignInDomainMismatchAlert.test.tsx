import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useSignInDomainMismatch } from "./hooks/useSignInDomainMismatch"
import { SignInDomainMismatchAlert } from "./SignInDomainMismatchAlert"

const signIn = (domain: string) =>
  `${domain} wants you to sign in with your Solana account:\n7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv`

const SignInScreen = ({ message }: { message: string }) => {
  const mismatch = useSignInDomainMismatch(message, "http://localhost:5600/vault")
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
    render(<SignInScreen message={signIn("app.orbinum.network")} />)

    expect(screen.getByText("Sign in domain is different from website domain.")).toBeDefined()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(true)

    fireEvent.click(screen.getByRole("checkbox"))

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(false)
  })

  it("lets the risk be acknowledged when the sign-in names no domain", () => {
    render(<SignInScreen message={signIn("https://")} />)

    fireEvent.click(screen.getByRole("checkbox"))

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(false)
  })

  it("shows nothing and blocks nothing for the requesting site or a plain message", () => {
    const { rerender } = render(<SignInScreen message={signIn("localhost:5600")} />)
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(false)

    rerender(<SignInScreen message="app.orbinum.network is not a sign-in" />)
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sign" }).disabled).toBe(false)
  })
})
