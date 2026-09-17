import { expect, it } from "vitest"
import { shouldScanSite } from "./shouldScanSite"

it.each([
  "authorize.tab",
  "bytes.sign",
  "extrinsic.sign",
  "vrf.sign",
  "accounts.list",
  "accounts.subscribe",
  "solana.provider.connect",
  "solana.provider.signIn",
  "solana.provider.signMessage",
  "solana.provider.signTransaction",
])("scans pub(%s)", async (message) => {
  expect(await shouldScanSite(`pub(${message})`, null, async () => false)).toBe(true)
})

it.each([
  "eth_requestAccounts",
  "wallet_requestPermissions",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "eth_sendTransaction",
])("scans %s", async (method) => {
  expect(await shouldScanSite("pub(eth.request)", { method }, async () => false)).toBe(true)
})

it.each([
  "eth_call",
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "wallet_sendCalls",
  "eth_unknown",
])("never scans %s", async (method) => {
  expect(await shouldScanSite("pub(eth.request)", { method }, async () => true)).toBe(false)
})

it.each([
  "eth.subscribe",
  "rpc.send",
  "rpc.subscribe",
  "metadata.list",
  "metadata.provide",
  "phishing.redirectIfDenied",
  "solana.provider.subscribe",
  "talisman.getAccount",
  "ping",
])("never scans pub(%s)", async (message) => {
  expect(
    await shouldScanSite(`pub(${message})`, { method: "personal_sign" }, async () => true)
  ).toBe(false)
})

it.each([true, false])("only scans eth_accounts when connected: %s", async (connected) => {
  expect(
    await shouldScanSite("pub(eth.request)", { method: "eth_accounts" }, async () => connected)
  ).toBe(connected)
})

it.each([null, undefined, {}, { method: 42 }])(
  "ignores malformed requests: %s",
  async (request) => {
    expect(await shouldScanSite("pub(eth.request)", request, async () => true)).toBe(false)
  }
)
