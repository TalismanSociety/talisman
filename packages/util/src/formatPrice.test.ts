import { formatPrice } from "./formatPrice"

describe("formatDecimals", () => {
  it("works", () => {
    expect(formatPrice(0.0000001, "usd", true)).toEqual("$0.000000100")
    expect(formatPrice(0.0000001, "usd", false)).toEqual("$0.000000100")
    expect(formatPrice(1, "usd", true)).toEqual("$1.00")
    expect(formatPrice(1, "usd", false)).toEqual("$1.00")
    expect(formatPrice(97156.156156485, "usd", true)).toEqual("$97.16K")
    expect(formatPrice(97156.156156485, "usd", false)).toEqual("$97,156.156156485")
    expect(formatPrice(609.325645498, "usd", true)).toEqual("$609.3")
    expect(formatPrice(609.325645498, "usd", false)).toEqual("$609.325645498")
    expect(formatPrice(609.325645498, "eth", true)).toEqual("ETH 609.3")
    expect(formatPrice(609.325645498, "eth", false)).toEqual("ETH 609.325645498")
  })
})
