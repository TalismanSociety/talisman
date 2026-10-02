import { generateMnemonic } from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english.js"
import { expect, test } from "vitest"

import { redactSecrets } from "./redactSecrets"

const tokens = (text: string) => new Set(text.toLowerCase().match(/\p{L}+/gu) ?? [])

const leaks = (output: string, phrase: string, template: string) => {
  const framingWords = tokens(template)
  const phraseWords = tokens(phrase)
  return [...tokens(output)].some((word) => phraseWords.has(word) && !framingWords.has(word))
}

test("every valid phrase length is redacted wherever it sits in a string", () => {
  for (const strength of [128, 160, 192, 224, 256]) {
    for (let i = 0; i < 200; i++) {
      const phrase = generateMnemonic(wordlist, strength)
      const framings = [
        (p: string) => p,
        (p: string) => `Invalid mnemonic: ${p}`,
        (p: string) => `{"seed":"${p}"}`,
        (p: string) => `seed=${p}.`,
        (p: string) => `wrong ${p} again`,
      ]
      for (const frame of framings) {
        const text = frame(phrase)
        const out = redactSecrets(text)
        expect(out.includes("<mnemonic>"), `not redacted: ${text}`).toBe(true)
        expect(!leaks(out, phrase, frame("")), `leaked words: ${out}`).toBe(true)
      }
    }
  }
})

test("only the run of wordlist words is redacted, not its lowercase neighbours", () => {
  const phrase = generateMnemonic(wordlist, 128)
  expect(redactSecrets(`malformed mnemonics ${phrase} discarded`)).toBe(
    "malformed mnemonics <mnemonic> discarded"
  )
})

test("eleven wordlist words are not a phrase", () => {
  const eleven = generateMnemonic(wordlist, 128).split(" ").slice(0, 11).join(" ")
  expect(redactSecrets(eleven)).toBe(eleven)
})

test("words off the wordlist are never redacted as a phrase", () => {
  const animals = "zebra quokka wombat koala dingo emu platypus numbat bilby quoll possum galah"
  expect(redactSecrets(animals)).toBe(animals)
})

test("a capitalised word breaks a phrase", () => {
  const words = generateMnemonic(wordlist, 128).split(" ")
  const capitalised = [words[0].toUpperCase(), ...words.slice(1)].join(" ")
  expect(redactSecrets(capitalised)).toBe(capitalised)
})

test("hex strings are redacted", () => {
  const evmKey = `0x${"a1b2c3d4".repeat(8)}`
  const bareKey = "a1b2c3d4".repeat(8)
  expect(redactSecrets(`private key ${evmKey}`)).toBe("private key <hex>")
  expect(redactSecrets(`private key ${bareKey}`)).toBe("private key <hex>")
  expect(redactSecrets("insufficient funds for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(
    "insufficient funds for <hex>"
  )
  expect(redactSecrets("addr 0Xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe("addr <hex>")
  expect(redactSecrets(`pk_${bareKey}`)).toBe("pk_<hex>")
})

test("a short hex value is no secret: a chain id, a status code, a symbol", () => {
  for (const text of ["chain 0x89 rejected", "Locked device (0x5515)", "0xBTC"])
    expect(redactSecrets(text)).toBe(text)
})

test("base58 keys and addresses are redacted", () => {
  const solanaSecret =
    "4NMwxzmYj2uvHuq8xoqhY8RXg63KSVJM1DXkpbmkUY7YQWuoyQgFnnzn6yo3CMnqZasnNDNa4yN1nRmZxTxXbS6K"
  expect(redactSecrets(`import failed ${solanaSecret}`)).toBe("import failed <base58>")
  expect(redactSecrets("send from 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")).toBe(
    "send from <base58>"
  )
  expect(redactSecrets("balances_5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY_0")).toBe(
    "balances_<base58>_0"
  )
})

test("ordinary messages and analytics values pass through", () => {
  for (const text of [
    "Failed to fetch",
    "the account must have enough balance to cover",
    "/portfolio/tokens/:symbol",
    "polkadot-substrate-native",
    "018f5c2a-7b1e-7cc3-9b4e-2f0a1d6c9e11",
    "10k-100k",
    "eth_signTypedData_v4",
  ]) {
    expect(redactSecrets(text)).toBe(text)
  }
})

test("long ordinary sentences pass through", () => {
  const sentence =
    "unable to reach the remote node because the connection was closed before any reply came"
  expect(redactSecrets(sentence)).toBe(sentence)
})
