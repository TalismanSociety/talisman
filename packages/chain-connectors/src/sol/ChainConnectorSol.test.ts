import { Connection } from "@solana/web3.js"
import { describe, expect, it } from "vitest"
import { ChainConnectorSolStub } from "./ChainConnectorSolStub"
import { getSolConnection } from "./getSolConnection"

describe("getSolConnection", () => {
  it("creates a Connection with the first RPC URL", () => {
    const conn = getSolConnection("solana", [
      "https://rpc1.example.com",
      "https://rpc2.example.com",
    ])
    expect(conn).toBeInstanceOf(Connection)
    expect(conn.rpcEndpoint).toBe("https://rpc1.example.com")
  })

  it('uses "confirmed" commitment', () => {
    const conn = getSolConnection("solana", ["https://rpc.example.com"])
    expect(conn.commitment).toBe("confirmed")
  })
})

describe("ChainConnectorSolStub", () => {
  it("creates a connection from a network object", async () => {
    const network = { id: "solana" as const, rpcs: ["https://rpc.example.com"] }
    const stub = new ChainConnectorSolStub(network)
    const conn = await stub.getConnection()

    expect(conn).toBeInstanceOf(Connection)
    expect(conn.rpcEndpoint).toBe("https://rpc.example.com")
  })

  it("stores an existing Connection when passed directly", async () => {
    const connection = new Connection("https://direct.example.com", { commitment: "finalized" })
    const stub = new ChainConnectorSolStub(connection)
    const conn = await stub.getConnection()

    expect(conn).toBe(connection)
    expect(conn.rpcEndpoint).toBe("https://direct.example.com")
  })

  it("getConnection() returns the same connection each time", async () => {
    const network = { id: "solana" as const, rpcs: ["https://rpc.example.com"] }
    const stub = new ChainConnectorSolStub(network)

    const conn1 = await stub.getConnection()
    const conn2 = await stub.getConnection()
    expect(conn1).toBe(conn2)
  })

  it("stores a Connection coming from a different @solana/web3.js module instance", async () => {
    // Regression test: in bundled builds @solana/web3.js can be duplicated across chunks,
    // so a Connection can fail `instanceof Connection` against another copy's class. We
    // simulate that with a Connection-shaped object that is NOT an instanceof Connection.
    // The old `instanceof` code fell through to getSolConnection(undefined, undefined) and
    // threw "Cannot read properties of undefined (reading '0')". The duck-typed check must
    // treat it as a Connection (no `rpcs` field) and store it as-is.
    const foreignConnection = {
      rpcEndpoint: "https://foreign.example.com",
      commitment: "confirmed",
    }
    expect(foreignConnection).not.toBeInstanceOf(Connection)

    const stub = new ChainConnectorSolStub(foreignConnection as unknown as Connection)
    const conn = await stub.getConnection()

    expect(conn).toBe(foreignConnection)
  })
})
