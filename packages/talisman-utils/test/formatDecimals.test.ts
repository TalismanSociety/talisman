import { formatDecimals } from "../src"

describe("formatDecimals", () => {
  it("works", () => {
    expect(formatDecimals("0.0000001")).toEqual("< 0.0001")
    expect(formatDecimals("0.01")).toEqual("0.01")
    expect(formatDecimals("0.0100000001")).toEqual("0.01")
    expect(formatDecimals("1000.0100000001")).toEqual("1,000")
    expect(formatDecimals("5.403")).toEqual("5.403")
    expect(formatDecimals("5.403", 10)).toEqual("5.403")
    expect(formatDecimals("5.403", 12)).toEqual("5.403")
  })
})
