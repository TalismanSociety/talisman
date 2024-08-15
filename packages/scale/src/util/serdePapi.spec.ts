import { papiParse, papiStringify } from "./serdePapi"

describe("papiParse/papiStringify", () => {
  test("test known inputs match expected outputs", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
})
