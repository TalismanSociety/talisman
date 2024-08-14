import { papiParse, papiStringify } from "./serdePapi"

describe("papiParse/papiStringify", () => {
  test("test known inputs match expected outputs", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tests: Array<[string | any, string | any]> = [
      [5, "5"],
      [5n, '"bigint:5"'],
      ["5", "5"],
      ['"bigint:12345"', '"bigint:12345"'],
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
    ]

    for (const [input, expectedOutput] of tests) {
      expect(papiStringify(papiParse(input))).toEqual(expectedOutput)
    }
  })
})
