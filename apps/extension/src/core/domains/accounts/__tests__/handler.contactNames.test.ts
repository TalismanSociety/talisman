import type { Account } from "@talismn/keyring"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ExtensionStore } from "../../../handlers/stores"
import type { Port } from "../../../types/base"
import AccountsHandler from "../handler"

const keyring = vi.hoisted(() => ({
  accounts: [] as Account[],
  updateAccount: vi.fn(async () => {}),
  addAccountExternalMulti: vi.fn(async (options: { address: string }[]) => options),
}))

vi.mock("../../keyring/store", () => ({
  keyringStore: {
    getAccounts: async () => keyring.accounts,
    getAccount: async (address: string) => keyring.accounts.find((a) => a.address === address),
    updateAccount: keyring.updateAccount,
    addAccountExternalMulti: keyring.addAccountExternalMulti,
  },
}))

const ACCOUNT = { type: "watch-only", address: "0xaccount", name: "Alice" } as Account
const CONTACT = { type: "contact", address: "0xcontact", name: "Bob", createdAt: 0 } as const

const handler = new AccountsHandler({
  password: { getPassword: async () => "password" },
} as unknown as ExtensionStore)
const port = {} as Port

describe("AccountsHandler contact names", () => {
  beforeEach(() => {
    keyring.accounts = [ACCOUNT, CONTACT]
    vi.clearAllMocks()
  })

  it("rejects a new contact named like an existing account", async () => {
    await expect(
      handler.handle(
        "1",
        "pri(accounts.add.external)",
        [{ type: "contact", address: "0xnew", name: " alice " }],
        port
      )
    ).rejects.toThrow("Name already in use")
  })

  it("rejects a contact named like an account added in the same request", async () => {
    keyring.accounts = []
    await expect(
      handler.handle(
        "1",
        "pri(accounts.add.external)",
        [
          { type: "watch-only", address: "0xwatched", name: "Carol", isPortfolio: false },
          { type: "contact", address: "0xnew", name: "carol" },
        ],
        port
      )
    ).rejects.toThrow("Name already in use")
  })

  it("rejects renaming a contact to a taken name through either rename message", async () => {
    await expect(
      handler.handle("1", "pri(accounts.rename)", { address: CONTACT.address, name: "ALICE" }, port)
    ).rejects.toThrow("Name already in use")
    await expect(
      handler.handle("1", "pri(accounts.update.contact)", { ...CONTACT, name: "alice" }, port)
    ).rejects.toThrow("Name already in use")
    expect(keyring.updateAccount).not.toHaveBeenCalled()
  })

  it("lets a contact keep its name", async () => {
    keyring.accounts = [ACCOUNT, { ...CONTACT, name: "Alice" }]
    await handler.handle("1", "pri(accounts.update.contact)", { ...CONTACT, name: "Alice" }, port)
    expect(keyring.updateAccount).toHaveBeenCalled()
  })
})
