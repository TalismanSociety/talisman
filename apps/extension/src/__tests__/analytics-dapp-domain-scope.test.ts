import { type Catalogue, catalogue } from "@common/analytics/catalogue"
import type { PropsOfEvent } from "@common/analytics/schema"
import { describe, expect, it } from "vitest"

/**
 * A hostname reaches analytics only as `dapp_domain`, only on dapp request, dapp transaction and
 * signing-screen error events, and only in the form `toDappDomain` gives it. A transaction event
 * carries it exactly when a dapp submitted the transaction, so a wallet transaction or a
 * `dapp_connection_*` event can never hold a dapp's domain.
 */
const DAPP_SIGNING_EVENTS = [
  "dapp_request_received",
  "dapp_request_rendered",
  "dapp_request_resolved",
  "error_shown",
  "tx_signed",
  "tx_broadcast",
  "tx_broadcast_failed",
  "tx_settled",
]

const TX_EVENTS = ["tx_signed", "tx_broadcast", "tx_broadcast_failed", "tx_settled"] as const

const TX_PROPS = {
  platform: "polkadot",
  network_id: "polkadot",
  tx_type: "other",
  signer: "local",
  sign_only: true,
  error_category: "rpc",
  status: "success",
  time_to_settle_ms: 1_000,
}

const txPropsOf = (event: (typeof TX_EVENTS)[number]) =>
  Object.fromEntries(
    catalogue[event].properties.flatMap((name) =>
      name in TX_PROPS ? [[name, TX_PROPS[name as keyof typeof TX_PROPS]]] : []
    )
  )

describe("dapp_domain stays on dapp signing events", () => {
  it("is declared by the dapp signing events and no other event", () => {
    const carriers = Object.entries(catalogue)
      .filter(([, def]) => def.properties.includes("dapp_domain"))
      .map(([name]) => name)

    expect(carriers.sort()).toEqual([...DAPP_SIGNING_EVENTS].sort())
  })

  it.each(TX_EVENTS)(
    "%s holds it when a dapp submitted the transaction, and only then",
    (event) => {
      const { schema } = catalogue[event]
      const props = txPropsOf(event)

      expect(
        schema.safeParse({ ...props, submitted_by: "dapp", dapp_domain: "app.example.com" }).success
      ).toBe(true)
      expect(schema.safeParse({ ...props, submitted_by: "dapp", dapp_domain: null }).success).toBe(
        true
      )
      expect(schema.safeParse({ ...props, submitted_by: "dapp" }).success).toBe(false)
      expect(schema.safeParse({ ...props, submitted_by: "wallet" }).success).toBe(true)
      expect(
        schema.safeParse({ ...props, submitted_by: "wallet", dapp_domain: "app.example.com" })
          .success
      ).toBe(false)
      expect(
        schema.safeParse({ ...props, submitted_by: "wallet", dapp_domain: null }).success
      ).toBe(false)
    }
  )

  it("is a type error on a wallet transaction, and required on a dapp one", () => {
    type Signed = PropsOfEvent<Catalogue["tx_signed"]>
    const base = {
      platform: "polkadot",
      network_id: "polkadot",
      tx_type: "other",
      signer: "local",
      sign_only: true,
    } as const

    const wallet: Signed = { ...base, submitted_by: "wallet" }
    const dapp: Signed = { ...base, submitted_by: "dapp", dapp_domain: "app.example.com" }
    // @ts-expect-error a wallet transaction has no dapp
    const walletWithDomain: Signed = {
      ...base,
      submitted_by: "wallet",
      dapp_domain: "app.example.com",
    }
    // @ts-expect-error a dapp transaction names its dapp
    const dappWithoutDomain: Signed = { ...base, submitted_by: "dapp" }

    expect([wallet, dapp, walletWithDomain, dappWithoutDomain]).toHaveLength(4)
  })

  it.each([
    "localhost",
    "192.168.1.10",
    "App.Example.com",
    "app.example.com:8443",
    "https://app.example.com",
    "app.example.com/swap",
  ])("rejects %j, a value toDappDomain never returns, on every event that declares it", (value) => {
    for (const event of DAPP_SIGNING_EVENTS) {
      const { shape } = catalogue[event as keyof Catalogue].schema as unknown as {
        shape: Record<string, { safeParse: (v: unknown) => { success: boolean } }>
      }
      expect(shape.dapp_domain.safeParse(value).success, event).toBe(false)
    }
  })
})
