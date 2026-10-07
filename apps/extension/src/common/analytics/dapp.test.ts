import type { ValidRequests } from "@core/libs/requests/types"
import { describe, expect, it } from "vitest"

import { DAPP_METHODS, describeDappRequest } from "./dapp"

const request = (partial: object) => partial as ValidRequests

describe("describeDappRequest", () => {
  it.each([
    [{ type: "auth", request: { provider: "ethereum" } }, "connect", "ethereum"],
    [{ type: "auth", request: { provider: "solana" } }, "connect", "solana"],
    [{ type: "auth-sol-signIn" }, "signIn", "solana"],
    [{ type: "eth-sign", method: "eth_signTypedData_v4" }, "eth_signTypedData_v4", "ethereum"],
    [{ type: "eth-send" }, "eth_sendTransaction", "ethereum"],
    [{ type: "eth-network-add" }, "wallet_addEthereumChain", "ethereum"],
    [{ type: "eth-watchasset" }, "wallet_watchAsset", "ethereum"],
    [
      { type: "substrate-sign", request: { payload: { genesisHash: "0x91" } } },
      "signPayload",
      "polkadot",
    ],
    [{ type: "substrate-sign", request: { payload: { data: "0x00" } } }, "signRaw", "polkadot"],
    [{ type: "vrf-sign" }, "signVrf", "polkadot"],
    [{ type: "sol-sign", request: { type: "message" } }, "signMessage", "solana"],
    [
      { type: "sol-sign", request: { type: "transaction", send: true } },
      "signAndSendTransaction",
      "solana",
    ],
    [
      { type: "sol-sign", request: { type: "transaction", send: false } },
      "signTransaction",
      "solana",
    ],
  ])("%j -> %s on %s", (partial, method, platform) => {
    const described = describeDappRequest(request(partial))

    expect(described).toEqual({ method, platform })
    expect(DAPP_METHODS).toContain(described.method)
  })
})
