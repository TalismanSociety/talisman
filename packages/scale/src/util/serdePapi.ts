import { Binary } from "@polkadot-api/substrate-bindings"

/**
 * For the substrate-tokens (and other) modules, we configure the `onChainId` field in chaindata to tell the module how to query each token.
 * These queries are made to the tokens pallet.
 * E.g. api.query.Tokens.Account(accountAddress, papiParse(onChainId))
 *
 * The `onChainId` field on chaindata must be a JSON-parseable string, but for some SCALE types we must
 * decode them into the values that `polkadot-api` expects.
 *
 * Note on polkadot-api v2: the `Binary` class was removed, and the SCALE codecs no longer accept
 * `Binary` instances. The byte fields used in `onChainId` are all fixed-size (`[u8; N]`, e.g.
 * `AccountId32`, `AccountKey20`, `GeneralKey.data`, Erc20 addresses, Stellar code/issuer): papi v2
 * encodes and decodes these as plain `0x` hex strings (`SizedHex`), NOT as `Uint8Array`s. So the
 * legacy `hex:` / `bin:` prefixes must be turned into hex strings here — passing a `Uint8Array`
 * (the old `Binary.fromHex` / `Binary.fromText` output) makes the fixed-size codec build a garbage
 * statekey, which silently returns no balance.
 *
 * `papiParse` and `papiStringify` are inverses. The canonical serialised form keeps the `hex:`
 * prefix, so `papiStringify` re-tags any `0x` hex string (the form papi v2 decodes byte fields into)
 * back to `hex:…`. This keeps round-trips stable and lets `onChainId` comparisons work whether the
 * stored value uses the legacy `hex:` prefix or a bare `0x` string.
 *
 * Some examples:
 * Input: `5`
 * Output: `5`
 *
 * Input: `{ type: "DexShare", value: [ { type: "Token", value: { type: "ACA" } }, { type: "Token", value: { type: "AUSD" } } ] }`
 * Output: `Enum("DexShare", [Enum("Token", Enum("ACA")), Enum("Token", Enum("AUSD"))])`
 *
 * Input: `{ type: "LiquidCrowdloan", value: 13 }`
 * Output: `Enum("LiquidCrowdloan", 13)`
 *
 * Input: `{ type: "NativeToken", value: "bigint:2" }`
 * Output: `Enum("NativeToken", 2n)`
 *
 * Input: `{ type: "Erc20", value: "hex:0x07df96d1341a7d16ba1ad431e2c847d978bc2bce" }`
 * Output: `Enum("Erc20", "0x07df96d1341a7d16ba1ad431e2c847d978bc2bce")`
 *
 * Input: `{ type: "Stellar", value: { code: "bin:TZS", issuer: "hex:0x34c94b2a4ba9e8b57b22547dcbb30f443c4cb02da3829a89aa1bd4780e4466ba" } }`
 * Output: `Enum("Stellar", { code: "0x545a53", issuer: "0x34c94b2a4ba9e8b57b22547dcbb30f443c4cb02da3829a89aa1bd4780e4466ba" })`
 */
export const papiParse = <T = unknown>(text: string | T): T => {
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  const reviver = (_key: string, value: any) => {
    if (typeof value !== "string") return value
    if (value.startsWith("bigint:")) return BigInt(value.slice("bigint:".length))
    // papi v2 fixed-size byte codecs expect a `0x` hex string, not a `Uint8Array`.
    if (value.startsWith("hex:")) return value.slice("hex:".length)
    if (value.startsWith("bin:")) return Binary.toHex(Binary.fromText(value.slice("bin:".length)))
    return value
  }

  if (typeof text !== "string") return text
  return JSON.parse(text, reviver)
}

const HEX_STRING_REGEX = /^0x[0-9a-f]*$/i

export const papiStringify = (value: unknown, space?: string | number): string => {
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  const replacer = (_key: string, value: any) => {
    if (typeof value === "bigint") return `bigint:${String(value)}`
    if (value instanceof Uint8Array) return `hex:${Binary.toHex(value)}`
    // papi v2 decodes byte fields into `0x` hex strings; re-tag them to the canonical `hex:` form.
    if (typeof value === "string" && HEX_STRING_REGEX.test(value)) return `hex:${value}`
    return value
  }

  return JSON.stringify(value, replacer, space)
}
