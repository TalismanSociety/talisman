import { generateMnemonic } from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english.js"
import { describe, expect, it } from "vitest"

import { redactSecrets } from "./redactSecrets"
import { scrubExceptionMessage } from "./scrubExceptionMessage"

const SIX_WORDS = "abandon ability able about above absent"

describe("scrubExceptionMessage", () => {
  it.each([
    [
      "a comma-separated phrase",
      `bad seed: ${SIX_WORDS.replaceAll(" ", ", ")}`,
      "bad seed: <mnemonic>",
    ],
    ["a JSON-array phrase", `["${SIX_WORDS.replaceAll(" ", '","')}"]`, '["<mnemonic>"]'],
    [
      "a capitalised phrase",
      `Mnemonic ${SIX_WORDS.toUpperCase()} rejected`,
      "Mnemonic <mnemonic> rejected",
    ],
    ["a URL", "fetch https://rpc.example/v1?key=abc failed", "fetch <url> failed"],
    ["an email address", "no account for jo.doe+x@mail.example", "no account for <email>"],
    ["a decimal", "balance 12.5 is too low", "balance <n> is too low"],
    ["an integer of 5 digits", "block 12345 not found", "block <n> not found"],
    ["short 0x hex", "bad selector 0x1234", "bad selector <hex>"],
    [
      "a base58 key",
      "unknown 5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ",
      "unknown <base58>",
    ],
  ])("scrubs %s", (_, message, expected) => {
    expect(scrubExceptionMessage(message)).toBe(expected)
  })

  it("keeps a run of five wordlist words, which ordinary messages reach", () => {
    const message = "the account must have enough balance to cover"
    expect(scrubExceptionMessage(message)).toBe(message)
  })

  it("keeps short integers and words", () => {
    const message = "Cannot read properties of undefined (reading 'length') at index 3"
    expect(scrubExceptionMessage(message)).toBe(message)
  })

  it("cuts to 300 characters", () => {
    const out = scrubExceptionMessage("x ".repeat(400))
    expect(out).toHaveLength(301)
    expect(out.endsWith("…")).toBe(true)
  })

  it("is a fixed point of itself and of redactSecrets, so the fingerprint matches the sent value", () => {
    const messages = [
      `Invalid mnemonic: ${generateMnemonic(wordlist, 128)}`,
      `failed for 0x${"ab".repeat(20)} at https://x.example/0xdead with 1.5 DOT`,
      `seed ${SIX_WORDS} then 5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ`,
      `${"word ".repeat(70)}0x${"cd".repeat(40)}`,
    ]
    for (const message of messages) {
      const once = scrubExceptionMessage(message)
      expect(scrubExceptionMessage(once)).toBe(once)
      expect(redactSecrets(once)).toBe(once)
    }
  })
})
