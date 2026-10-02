import type { ValidRequests } from "@core/libs/requests/types"
import { describe, expect, it } from "vitest"

import { DAPP_METHODS, describeDappRequest, toDappDomain } from "./dapp"
import { properties } from "./properties"

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

describe("toDappDomain", () => {
  it.each([
    ["https://App.Uniswap.org:8443/swap?inputCurrency=0xabc#top", "app.uniswap.org"],
    ["http://localhost:3000/", "localhost"],
    ["http://127.0.0.1:8080", "127.0.0.1"],
    ["ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/", "ipfs"],
    ["ipns://app.example.eth", "ipns"],
    ["http://[::1]:3000/", null],
    ["file:///Users/me/dapp.html", null],
    ["chrome-extension://abc/popup.html", null],
    ["not a url", null],
    [undefined, null],
  ])("%s -> %s", (url, domain) => {
    const result = toDappDomain(url)

    expect(result).toBe(domain)
    expect(properties.dapp_domain.schema.safeParse(result).success).toBe(true)
  })
})
