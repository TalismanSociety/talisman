import { wordlist } from "@scure/bip39/wordlists/english.js"

import { redactSecrets } from "./redactSecrets"

const MAX_MESSAGE_LENGTH = 300

const BIP39_WORDS: ReadonlySet<string> = new Set(wordlist)

const MIN_MNEMONIC_RUN = 6
const WORD_RUN = /[A-Za-z]+(?:[\s,"'[\]]+[A-Za-z]+)*/g
const WORD = /[A-Za-z]+/g

const scrubMnemonicRuns = (message: string): string =>
  message.replace(WORD_RUN, (run) => {
    const words = [...run.matchAll(WORD)]
    const spans: [number, number][] = []
    let start = 0
    for (let i = 0; i <= words.length; i++) {
      const word = words[i]
      if (word && BIP39_WORDS.has(word[0].toLowerCase())) continue
      if (i - start >= MIN_MNEMONIC_RUN) {
        const first = words[start]
        const last = words[i - 1]
        spans.push([first.index, last.index + last[0].length])
      }
      start = i + 1
    }
    return spans
      .reverse()
      .reduce((out, [from, to]) => `${out.slice(0, from)}<mnemonic>${out.slice(to)}`, run)
  })

const BEFORE_SECRETS: readonly [RegExp, string][] = [
  [/https?:\/\/[^\s"')]+/g, "<url>"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>"],
]

const AFTER_SECRETS: readonly [RegExp, string][] = [
  [/\b\d+\.\d+\b/g, "<n>"],
  [/\b\d{5,}\b/g, "<n>"],
]

export const scrubExceptionMessage = (message: string): string => {
  let out = scrubMnemonicRuns(message)
  for (const [pattern, placeholder] of BEFORE_SECRETS) out = out.replace(pattern, placeholder)
  out = redactSecrets(out)
  for (const [pattern, placeholder] of AFTER_SECRETS) out = out.replace(pattern, placeholder)
  return out.length > MAX_MESSAGE_LENGTH ? `${out.slice(0, MAX_MESSAGE_LENGTH)}…` : out
}
