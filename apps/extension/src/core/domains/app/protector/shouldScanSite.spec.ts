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
])("scans pub(%s)", (message) => {
  expect(shouldScanSite(`pub(${message})`, null, false)).toBe(true)
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
])("scans %s", (method) => {
  expect(shouldScanSite("pub(eth.request)", { method }, false)).toBe(true)
})

it.each([
  "eth_call",
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "wallet_sendCalls",
  "eth_unknown",
])("never scans %s", (method) => {
  expect(shouldScanSite("pub(eth.request)", { method }, true)).toBe(false)
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
])("never scans pub(%s)", (message) => {
  expect(shouldScanSite(`pub(${message})`, { method: "personal_sign" }, true)).toBe(false)
})

it.each([true, false])("only scans eth_accounts when connected: %s", (connected) => {
  expect(shouldScanSite("pub(eth.request)", { method: "eth_accounts" }, connected)).toBe(connected)
})

it.each([null, undefined, {}, { method: 42 }])("ignores malformed requests: %s", (request) => {
  expect(shouldScanSite("pub(eth.request)", request, true)).toBe(false)
})
