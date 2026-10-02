import { wordlist } from "@scure/bip39/wordlists/english.js"

const BIP39_WORDS: ReadonlySet<string> = new Set(wordlist)

const MIN_MNEMONIC_WORDS = 12
const LOWERCASE_WORD_RUN = /(?<![A-Za-z])[a-z]+(?: [a-z]+){11,}(?![A-Za-z])/g

const redactMnemonicRun = (run: string): string => {
  const words = run.split(" ")
  const out: string[] = []
  let start = 0
  while (start < words.length) {
    let end = start
    while (end < words.length && BIP39_WORDS.has(words[end])) end++
    if (end - start >= MIN_MNEMONIC_WORDS) out.push("<mnemonic>")
    else out.push(...words.slice(start, end + 1))
    start = end - start >= MIN_MNEMONIC_WORDS ? end : end + 1
  }
  return out.join(" ")
}

const RULES: readonly [RegExp, string | ((match: string) => string)][] = [
  [LOWERCASE_WORD_RUN, redactMnemonicRun],
  [/0x[0-9a-fA-F]+/g, "<hex>"],
  [/\b[0-9a-fA-F]{32,}\b/g, "<hex>"],
  [/\b[1-9A-HJ-NP-Za-km-z]{32,}\b/g, "<base58>"],
]

export const redactSecrets = (text: string): string =>
  RULES.reduce(
    (out, [pattern, replacement]) =>
      typeof replacement === "string"
        ? out.replace(pattern, replacement)
        : out.replace(pattern, replacement),
    text
  )
