import type { ValidRequests } from "@core/libs/requests/types"
import { describe, expect, it } from "vitest"

import { DAPP_METHODS, describeDappRequest, isDappDomain, toDappDomain } from "./dapp"
import { properties } from "./properties"

const request = (partial: object) => partial as ValidRequests

describe("describeDappRequest", () => {
  it.each([
    [{ type: "auth", request: { provider: "ethereum" } }, "connect", "ethereum", "connect"],
    [{ type: "auth", request: { provider: "solana" } }, "connect", "solana", "connect"],
    [{ type: "auth-sol-signIn" }, "signIn", "solana", "message"],
    [{ type: "eth-sign", method: "personal_sign" }, "personal_sign", "ethereum", "message"],
    [
      { type: "eth-sign", method: "eth_signTypedData_v4" },
      "eth_signTypedData_v4",
      "ethereum",
      "message",
    ],
    [{ type: "eth-send" }, "eth_sendTransaction", "ethereum", "transaction"],
    [{ type: "eth-network-add" }, "wallet_addEthereumChain", "ethereum", "add_network"],
    [{ type: "eth-watchasset" }, "wallet_watchAsset", "ethereum", "watch_asset"],
    [
      { type: "substrate-sign", request: { payload: { genesisHash: "0x91" } } },
      "signPayload",
      "polkadot",
      "transaction",
    ],
    [
      { type: "substrate-sign", request: { payload: { data: "0x00" } } },
      "signRaw",
      "polkadot",
      "message",
    ],
    [
      {
        type: "substrate-sign",
        request: { payload: { genesisHash: "0x91" }, method: "createTransaction" },
      },
      "createTransaction",
      "polkadot",
      "transaction",
    ],
    [{ type: "vrf-sign" }, "signVrf", "polkadot", "message"],
    [{ type: "sol-sign", request: { type: "message" } }, "signMessage", "solana", "message"],
    [
      { type: "sol-sign", request: { type: "transaction", send: true } },
      "signAndSendTransaction",
      "solana",
      "transaction",
    ],
    [
      { type: "sol-sign", request: { type: "transaction", send: false } },
      "signTransaction",
      "solana",
      "transaction",
    ],
  ])("%j -> %s on %s, a %s request", (partial, method, platform, requestType) => {
    const described = describeDappRequest(request({ ...partial, url: "https://app.example.com/" }))

    expect(described).toEqual({ method, platform, requestType, dappDomain: "app.example.com" })
    expect(DAPP_METHODS).toContain(described.method)
  })
})

describe("toDappDomain", () => {
  it.each([
    [
      "keeps the hostname only",
      "https://app.uniswap.org/swap?inputCurrency=0xabc#top",
      "app.uniswap.org",
    ],
    ["lowercases", "https://App.Uniswap.ORG/", "app.uniswap.org"],
    ["drops the port", "https://app.uniswap.org:8443/", "app.uniswap.org"],
    ["drops credentials", "https://user:secret@app.uniswap.org/", "app.uniswap.org"],
    ["drops a trailing dot", "https://app.uniswap.org./", "app.uniswap.org"],
    [
      "names the ipfs scheme only",
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/",
      "ipfs",
    ],
    ["names the ipns scheme only", "ipns://app.example.eth", "ipns"],
    [
      "reduces a vercel preview to the platform",
      "https://my-dapp-git-feature-team.vercel.app/",
      "vercel.app",
    ],
    [
      "reduces a netlify site to the platform",
      "https://deploy-preview-42--dapp.netlify.app/",
      "netlify.app",
    ],
    ["reduces a pages.dev site to the platform", "https://abc123.dapp.pages.dev/", "pages.dev"],
    ["reduces a github.io site to the platform", "https://someone.github.io/dapp/", "github.io"],
    ["keeps the bare platform domain", "https://vercel.app/", "vercel.app"],
    [
      "reduces a codespace to the platform",
      "https://someone-dapp-x7.app.github.dev/",
      "app.github.dev",
    ],
    ["reduces a workers.dev site to the platform", "https://someone.workers.dev/", "workers.dev"],
    ["reduces a firebase site to the platform", "https://someone-project.web.app/", "web.app"],
    [
      "reduces an ngrok tunnel to the platform",
      "https://abcd-12-34-56-78.ngrok-free.app/",
      "ngrok-free.app",
    ],
    [
      "reduces a cloudflare tunnel to the platform",
      "https://someone-dev.trycloudflare.com/",
      "trycloudflare.com",
    ],
    ["matches platforms on a label boundary", "https://notvercel.app/", "notvercel.app"],
    ["hides localhost", "http://localhost:3000/", null],
    ["hides a localhost subdomain", "http://dapp.localhost:5173/", null],
    ["hides an IPv4 address", "http://127.0.0.1:8080", null],
    ["hides a private IPv4 address", "http://192.168.1.10/", null],
    ["hides an IPv6 address", "http://[::1]:3000/", null],
    ["hides a .local host", "https://printer.local/", null],
    ["hides a .lan host", "http://router.lan/", null],
    ["hides a single-label host", "http://intranet/", null],
    ["hides a tailnet host", "https://machine.tailnet-abc.ts.net/", null],
    ["hides a .test host", "https://myapp.test/", null],
    ["hides a .corp host", "https://dapp.corp/", null],
    ["hides a file", "file:///Users/me/dapp.html", null],
    ["hides an extension page", "chrome-extension://abc/popup.html", null],
    ["hides what is not a url", "not a url", null],
    ["hides a missing url", undefined, null],
  ])("%s: %s -> %s", (_rule, url, domain) => {
    const result = toDappDomain(url)

    expect(result).toBe(domain)
    expect(properties.dapp_domain.schema.safeParse(result).success).toBe(true)
  })
})

describe("the dapp_domain property", () => {
  it.each([
    "localhost",
    "127.0.0.1",
    "printer.local",
    "intranet",
    "my-dapp.vercel.app",
    "App.Uniswap.org",
    "app.uniswap.org:8443",
    "https://app.uniswap.org",
    "app.uniswap.org/swap",
    "",
  ])("rejects %j, a value toDappDomain never returns", (value) => {
    expect(isDappDomain(value)).toBe(false)
    expect(properties.dapp_domain.schema.safeParse(value).success).toBe(false)
  })
})
