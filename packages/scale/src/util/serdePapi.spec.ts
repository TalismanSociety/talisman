import { describe, expect, test } from "vitest"
import { papiParse, papiStringify } from "./serdePapi"

describe("papiParse/papiStringify", () => {
  test("test known inputs match expected outputs", () => {
    // biome-ignore lint/suspicious/noExplicitAny: legacy
    const tests: Array<[string | any, string | any]> = [
      [5, "5"],
      [5n, '"bigint:5"'],
      ["5", "5"],
      ['"bigint:12345"', '"bigint:12345"'],
      ['"hex:0x123456"', '"hex:0x123456"'],
      ['"bin:0xhelloworld"', '"hex:0x307868656c6c6f776f726c64"'],
      [
        '{"type":"DexShare","value":[{"type":"Token","value":{"type":"ACA"}},{"type":"Token","value":{"type":"AUSD"}}]}',
        '{"type":"DexShare","value":[{"type":"Token","value":{"type":"ACA"}},{"type":"Token","value":{"type":"AUSD"}}]}',
      ],
      ['{"type":"LiquidCrowdloan","value":13}', '{"type":"LiquidCrowdloan","value":13}'],
      ['{"type":"NativeToken","value":"bigint:2"}', '{"type":"NativeToken","value":"bigint:2"}'],
      [
        '{"type":"Erc20","value":"hex:0x07df96d1341a7d16ba1ad431e2c847d978bc2bce"}',
        '{"type":"Erc20","value":"hex:0x07df96d1341a7d16ba1ad431e2c847d978bc2bce"}',
      ],
      [
        '{"type":"Stellar","value":{"code":"bin:TZS","issuer":"hex:0x34c94b2a4ba9e8b57b22547dcbb30f443c4cb02da3829a89aa1bd4780e4466ba"}}',
        '{"type":"Stellar","value":{"code":"hex:0x545a53","issuer":"hex:0x34c94b2a4ba9e8b57b22547dcbb30f443c4cb02da3829a89aa1bd4780e4466ba"}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":2011}}}',
        '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":2011}}}',
      ],
      [
        '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}}]}}',
        '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}}]}}',
      ],
      [
        '{"parents":2,"interior":{"type":"X1","value":{"type":"GlobalConsensus","value":{"type":"Kusama"}}}}',
        '{"parents":2,"interior":{"type":"X1","value":{"type":"GlobalConsensus","value":{"type":"Kusama"}}}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2030},{"type":"GeneralKey","value":{"length":2,"data":"hex:0x0001000000000000000000000000000000000000000000000000000000000000"}}]}}',
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2030},{"type":"GeneralKey","value":{"length":2,"data":"hex:0x0001000000000000000000000000000000000000000000000000000000000000"}}]}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2011},{"type":"GeneralKey","value":{"length":3,"data":"hex:0x6571640000000000000000000000000000000000000000000000000000000000"}}]}}',
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2011},{"type":"GeneralKey","value":{"length":3,"data":"hex:0x6571640000000000000000000000000000000000000000000000000000000000"}}]}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":3369}}}',
        '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":3369}}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2004},{"type":"PalletInstance","value":10}]}}',
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2004},{"type":"PalletInstance","value":10}]}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2030},{"type":"GeneralKey","value":{"length":2,"data":"hex:0x0900000000000000000000000000000000000000000000000000000000000000"}}]}}',
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2030},{"type":"GeneralKey","value":{"length":2,"data":"hex:0x0900000000000000000000000000000000000000000000000000000000000000"}}]}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2034},{"type":"GeneralIndex","value":"bigint:0"}]}}',
        '{"parents":1,"interior":{"type":"X2","value":[{"type":"Parachain","value":2034},{"type":"GeneralIndex","value":"bigint:0"}]}}',
      ],
      [
        '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":2051}}}',
        '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":2051}}}',
      ],
    ]

    for (const [input, expectedOutput] of tests) {
      expect(papiStringify(papiParse(input))).toEqual(expectedOutput)
    }
  })

  test("byte fields parse to 0x hex strings (papi v2 SizedHex codecs reject Uint8Array)", () => {
    // Regression: under polkadot-api v2 the fixed-size byte codecs expect a `0x` hex string.
    // The previous implementation returned a `Uint8Array` (`Binary.fromHex`/`fromText`), which made
    // foreign-asset / token statekeys silently encode to garbage and balances disappear.
    const erc20 = papiParse<{ type: string; value: unknown }>(
      '{"type":"Erc20","value":"hex:0x07df96d1341a7d16ba1ad431e2c847d978bc2bce"}'
    )
    expect(erc20.value).toBe("0x07df96d1341a7d16ba1ad431e2c847d978bc2bce")
    expect(erc20.value).not.toBeInstanceOf(Uint8Array)

    const location = papiParse<{ interior: { value: Array<{ value: { key?: string } }> } }>(
      '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"}}]}}'
    )
    const accountKey20 = location.interior.value[1].value.key
    expect(accountKey20).toBe("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")

    // `bin:` (text) byte fields also become hex strings, not Uint8Arrays.
    const stellar = papiParse<{ value: { code: string } }>(
      '{"type":"Stellar","value":{"type":"AlphaNum4","value":{"code":"bin:TZS"}}}'
    )
    // `value.value` because of the nested AlphaNum4 enum
    const code = (stellar.value as unknown as { value: { code: string } }).value.code
    expect(code).toBe("0x545a53")
    expect(code).not.toBeInstanceOf(Uint8Array)
  })

  test("bare 0x hex strings (papi v2 / chaindata v12 format) round-trip", () => {
    // chaindata generated under papi v2 stores byte fields as bare `0x` strings (no `hex:` prefix).
    // These must parse unchanged and re-serialise to the canonical `hex:` form.
    expect(papiParse('"0xabcdef"')).toBe("0xabcdef")
    expect(papiStringify(papiParse('"0xabcdef"'))).toBe('"hex:0xabcdef"')
    expect(
      papiStringify(
        papiParse(
          '{"parents":2,"interior":{"type":"X1","value":{"type":"AccountKey20","value":{"key":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"}}}}'
        )
      )
    ).toBe(
      '{"parents":2,"interior":{"type":"X1","value":{"type":"AccountKey20","value":{"key":"hex:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"}}}}'
    )
  })
})
