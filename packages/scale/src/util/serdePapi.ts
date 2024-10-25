import { Binary } from "@polkadot-api/substrate-bindings"

/**
 * For the substrate-tokens (and other) modules, we configure the `onChainId` field in chaindata to tell the module how to query each token.
 * These queries are made to the tokens pallet.
 * E.g. api.query.Tokens.Account(accountAddress, papiParse(onChainId))
 *
 * The `onChainId` field on chaindata must be a JSON-parseable string, but for some SCALE types (especially the Binary type) we must
 * use specific `polkadot-api` classes to handle SCALE-encoding the statekey.
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
 * Output: `Enum("Erc20", Binary.fromHex("0x07df96d1341a7d16ba1ad431e2c847d978bc2bce"))`
 *
 * Input: `{ type: "Stellar", value: { code: "bin:TZS", issuer: "hex:0x34c94b2a4ba9e8b57b22547dcbb30f443c4cb02da3829a89aa1bd4780e4466ba" } }`
 * Output: `Enum("Stellar", { code: Binary.fromText("TZS"), issuer: Binary.fromHex("0x34c94b2a4ba9e8b57b22547dcbb30f443c4cb02da3829a89aa1bd4780e4466ba") })`
 */
export const papiParse = <T = unknown>(text: string | T): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviver = (_key: string, value: any) => {
    if (typeof value !== "string") return value
    if (value.startsWith("bigint:")) return BigInt(value.slice("bigint:".length))
    if (value.startsWith("hex:")) return Binary.fromHex(value.slice("hex:".length))
    if (value.startsWith("bin:")) return Binary.fromText(value.slice("bin:".length))
    return value
  }

  if (typeof text !== "string") return text
  return JSON.parse(text, reviver)
}

export const papiStringify = (
  value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  space?: string | number,
): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replacer = (_key: string, value: any) => {
    if (typeof value === "bigint") return `bigint:${String(value)}`
    if (value instanceof Binary) return `hex:${value.asHex()}`
    return value
  }

  return JSON.stringify(value, replacer, space)
}
