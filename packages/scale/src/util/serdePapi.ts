import { Binary } from "@polkadot-api/substrate-bindings"

/**
 * For the substrate-tokens (and other) modules, we configure the `onChainId` field in chaindata to tell the module how to query each token.
 * These queries are made to the tokens pallet.
 * E.g. api.query.Tokens.Account(accountAddress, papiParse(onChainId))
 *
 * The `onChainId` field on chaindata must be a JSON-parseable string, but a decoded papi value can
 * contain types that plain JSON cannot represent. `papiStringify`/`papiParse` are inverse functions
 * that serialise *any* decoded papi value to a deterministic string and back.
 *
 * Only two decoded types are not valid JSON, so only these get a tag — everything else (numbers,
 * objects, and strings, including the `0x…` hex strings papi v2 decodes fixed-size `[u8; N]` fields
 * into) is already JSON and is left untouched:
 *   - `bigint`      → `bigint:<n>`
 *   - `Uint8Array`  → `u8a:0x<hex>`   (papi v2 decodes variable-length `Vec<u8>` to a `Uint8Array`)
 *
 * Note on polkadot-api v2 byte fields. The `Binary` class was removed and the SCALE codecs split
 * byte decoding into two distinct JS types, which `papiParse` must reproduce exactly or the codec
 * silently builds a garbage statekey (→ no balance):
 *   - fixed-size `[u8; N]` (`AccountId32`, `AccountKey20`, `GeneralKey.data`, Erc20 addresses,
 *     Stellar code/issuer, …) → a plain `0x` hex **string** (`SizedHex`). The codec's `.enc`
 *     expects that string. So a fixed-size field is just a JSON string: no tag, round-trips as-is.
 *   - variable-length `Vec<u8>` → a **`Uint8Array`**. The codec's `.enc` expects a `Uint8Array`,
 *     NOT a hex string. Hence the dedicated `u8a:` tag, which `papiParse` restores to a `Uint8Array`.
 *
 * `hex:` and `bin:` are legacy/authoring **input** forms still accepted by `papiParse` (some
 * chaindata token templates are hand-written with them), but `papiStringify` never emits them — it
 * normalises to the bare canonical form. So the canonical output is deterministic and idempotent:
 * `papiStringify(papiParse(canonical)) === canonical`.
 *
 * Some examples (input string → papiParse value):
 * Input: `5`                                            → `5`
 * Input: `{ type: "LiquidCrowdloan", value: 13 }`       → `Enum("LiquidCrowdloan", 13)`
 * Input: `{ type: "NativeToken", value: "bigint:2" }`   → `Enum("NativeToken", 2n)`
 * Input: `{ type: "Erc20", value: "0x07df…bce" }`       → `Enum("Erc20", "0x07df…bce")`        (fixed → string)
 * Input: `{ type: "Erc20", value: "hex:0x07df…bce" }`   → `Enum("Erc20", "0x07df…bce")`        (legacy input)
 * Input: `{ code: "bin:TZS" }`                          → `{ code: "0x545a53" }`               (legacy input)
 * Input: `"u8a:0xdeadbeef"`                             → `Uint8Array([0xde,0xad,0xbe,0xef])`  (variable bytes)
 */
export const papiParse = <T = unknown>(text: string | T): T => {
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  const reviver = (_key: string, value: any) => {
    if (typeof value !== "string") return value
    if (value.startsWith("bigint:")) return BigInt(value.slice("bigint:".length))
    // variable-length `Vec<u8>` → restore the `Uint8Array` the papi v2 codec expects.
    if (value.startsWith("u8a:")) return Binary.fromHex(value.slice("u8a:".length) as `0x${string}`)
    // legacy/authoring input forms. Fixed-size `[u8; N]` codecs expect a `0x` hex string, so both
    // map to a bare hex string (the bare `0x` canonical form passes through unchanged below).
    if (value.startsWith("hex:")) return value.slice("hex:".length)
    if (value.startsWith("bin:")) return Binary.toHex(Binary.fromText(value.slice("bin:".length)))
    return value
  }

  if (typeof text !== "string") return text
  return JSON.parse(text, reviver)
}

export const papiStringify = (value: unknown, space?: string | number): string => {
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  const replacer = (_key: string, value: any) => {
    // Only tag the types JSON cannot represent. Strings (incl. `0x` fixed-size hex), numbers and
    // objects are already valid JSON and pass through untouched — keeping the form deterministic.
    if (typeof value === "bigint") return `bigint:${String(value)}`
    if (value instanceof Uint8Array) return `u8a:${Binary.toHex(value)}`
    return value
  }

  return JSON.stringify(value, replacer, space)
}
