import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import type { Account } from "@talismn/keyring"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MessageTypes } from "../../types"
import { observeAccountMessage } from "./accountMessages"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => ({ calls: [] as TrackedCall[] }))
vi.mock("./track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const keyring = vi.hoisted(() => ({ accounts: [] as Account[] }))
vi.mock("../keyring/store", () => ({
  keyringStore: {
    getAccounts: () => Promise.resolve([...keyring.accounts]),
    getAccount: (address: string) =>
      Promise.resolve(keyring.accounts.find((account) => account.address === address)),
  },
}))

const ETH = "0x1111111111111111111111111111111111111111"
const ETH_2 = "0x2222222222222222222222222222222222222222"
const DOT = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const DOT_2 = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const DOT_3 = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"

const account = (type: Account["type"], address: string) => ({ type, address }) as Account

/** Runs one message the way the handler port does: observe, let the handler change the keyring, settle. */
const handle = async (
  type: MessageTypes,
  request: unknown,
  { adds = [], removes = [] }: { adds?: Account[]; removes?: string[] } = {},
  response: unknown = adds.map(({ address }) => address)
) => {
  const settle = observeAccountMessage(type, request)
  keyring.accounts = [
    ...keyring.accounts.filter(({ address }) => !removes.includes(address)),
    ...adds,
  ]
  await settle?.(response)
}

describe("account messages", () => {
  beforeEach(() => {
    tracked.calls = []
    keyring.accounts = []
  })

  it("sends only events the catalogue accepts", async () => {
    await handle("pri(accounts.add.derive)", [{ type: "new-mnemonic" }], {
      adds: [account("keypair", ETH)],
    })
    await handle("pri(accounts.add.external)", [{}, {}], {
      adds: [account("ledger-polkadot", DOT), account("ledger-polkadot", DOT_2)],
    })
    await handle("pri(accounts.forget)", { address: DOT })
    await handle("pri(mnemonics.setVerifierCertMnemonic)", { type: "existing", mnemonicId: "m" })

    expect(tracked.calls.length).toBeGreaterThan(0)
    for (const [event, props = {}] of tracked.calls)
      expect(catalogue[event].schema.safeParse(props).success, event).toBe(true)
  })

  it("ends onboarding with the wallet's first account, as mobile", async () => {
    await handle("pri(accounts.add.derive)", [{ type: "new-mnemonic" }], {
      adds: [account("keypair", ETH)],
    })

    expect(tracked.calls).toEqual([
      [
        "account_created",
        { origin: "seed", wallet_type: "ethereum", is_first_account: true, flow: "onboarding" },
      ],
      ["onboarding_completed", { origin: "seed", wallet_type: "ethereum" }],
    ])
  })

  it("adds to a wallet that has accounts without ending onboarding again", async () => {
    keyring.accounts = [account("keypair", ETH)]
    await handle("pri(accounts.add.derive)", [{ type: "existing-mnemonic" }], {
      adds: [account("keypair", ETH_2)],
    })

    expect(tracked.calls).toEqual([
      [
        "account_created",
        {
          origin: "existing_seed",
          wallet_type: "ethereum",
          is_first_account: false,
          flow: "add_account",
        },
      ],
    ])
  })

  it("does not count contacts as accounts, and sends nothing for a new contact", async () => {
    keyring.accounts = [account("contact", DOT_3)]
    await handle("pri(accounts.add.external)", [{ type: "contact" }], {
      adds: [account("contact", DOT)],
    })
    expect(tracked.calls).toEqual([])

    await handle("pri(accounts.add.keypair)", [{}], { adds: [account("keypair", ETH)] })
    expect(tracked.calls.map(([event]) => event)).toEqual([
      "account_created",
      "onboarding_completed",
    ])
    expect(tracked.calls[0][1]).toMatchObject({ origin: "private_key", is_first_account: true })
  })

  it("sends one event per import for Ledger, Vault and Signet, with the count", async () => {
    keyring.accounts = [account("keypair", ETH)]
    await handle("pri(accounts.add.external)", [{}, {}, {}], {
      adds: [
        account("ledger-polkadot", DOT),
        account("ledger-polkadot", DOT_2),
        account("ledger-polkadot", DOT_3),
      ],
    })
    await handle("pri(accounts.add.external)", [{}], {
      adds: [account("polkadot-vault", "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy")],
    })

    expect(tracked.calls).toEqual([
      ["ledger_accounts_imported", { count: 3, platform: "polkadot" }],
      ["external_accounts_imported", { account_type: "vault", count: 1, platform: "polkadot" }],
    ])
  })

  it("sends one watched account event per account", async () => {
    await handle("pri(accounts.add.external)", [{}, {}], {
      adds: [account("watch-only", ETH), account("watch-only", DOT)],
    })

    expect(tracked.calls).toEqual([
      ["account_watch_added", { wallet_type: "ethereum", flow: "onboarding" }],
      ["account_watch_added", { wallet_type: "polkadot", flow: "add_account" }],
      ["onboarding_completed", { origin: "watch", wallet_type: "ethereum" }],
    ])
  })

  it("reads the removed account's kind before the handler deletes it, and skips contacts", async () => {
    keyring.accounts = [account("ledger-ethereum", ETH), account("contact", DOT)]
    await handle("pri(accounts.forget)", { address: ETH }, { removes: [ETH] }, true)
    await handle("pri(accounts.forget)", { address: DOT }, { removes: [DOT] }, true)

    expect(tracked.calls).toEqual([["account_removed", { account_type: "ledger" }]])
  })

  it("sends nothing for messages that are not account changes", () => {
    expect(observeAccountMessage("pri(accounts.subscribe)", null)).toBeNull()
  })
})
