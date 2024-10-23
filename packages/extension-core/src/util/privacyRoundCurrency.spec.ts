import { privacyRoundCurrency } from "./privacyRoundCurrency"

describe("privacyRoundCurrency", () => {
  test("test known inputs match expected outputs", () => {
    const tests: Array<[input: number, expectedOutput: string]> = [
      [0.000000000000000000001234, "0"],
      [0.00000000000000000001234, "0.00000000000000000001"],
      [0.00001234, "0.00001"],
      [0.0001234, "0.0001"],
      [0.001234, "0.001"],
      [0.01234, "0.01"],
      [0.12345, "0.1"],
      [1.12345, "1"],
      [12.3456, "12"],
      [123.456, "123"],
      [1_234.56, "1230"],
      [1_789.56, "1790"],
      [12_345.67, "12300"],
      [123_456.78, "123000"],
      [1_234_567.89, "1230000"],
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision, no-loss-of-precision
      [1_234_567_891_234_567_891_234_567_891_234_567.89, "1230000000000000000000000000000000"],
    ]

    for (const [input, expectedOutput] of tests) {
      expect(privacyRoundCurrency(input)).toEqual(expectedOutput)
    }
  })
})
