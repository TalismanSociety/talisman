import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MsgSignButton } from "./MsgSignButton"

const ADDRESS = "7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv"

const accountType = vi.hoisted(() => ({ current: "keypair" }))

vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: () => ({ type: accountType.current, address: ADDRESS }),
}))
vi.mock("@ui/hooks/ledger/useLedgerSolana", () => ({
  useLedgerSolana: () => ({ sign: vi.fn() }),
}))

const renderButton = (disabled: boolean) =>
  render(
    <MsgSignButton
      payload={{ platform: "solana", address: ADDRESS, message: Buffer.from("hello") }}
      label="Sign"
      disabled={disabled}
      onSubmit={vi.fn()}
    />
  )

describe("MsgSignButton", () => {
  beforeEach(() => {
    accountType.current = "keypair"
  })

  it.each([
    ["keypair", "Sign"],
    ["ledger-solana", "Sign on Ledger"],
  ])("keeps the %s label while disabled", (type, label) => {
    accountType.current = type

    renderButton(true)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: label }).disabled).toBe(true)
  })

  it.each([
    ["keypair", "Sign"],
    ["ledger-solana", "Sign on Ledger"],
  ])("enables the %s button when not disabled", (type, label) => {
    accountType.current = type

    renderButton(false)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: label }).disabled).toBe(false)
  })
})
