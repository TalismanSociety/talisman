import { ethers } from "ethers"

import { getMaxFeePerGas } from "../helpers"

describe("Test ethereum helpers", () => {
  test("getMaxFeePerGas 0 block", async () => {
    const result = getMaxFeePerGas(
      ethers.utils.parseUnits("2", "gwei"),
      ethers.utils.parseUnits("8", "gwei"),
      0
    ).toString()
    const expected = ethers.utils.parseUnits("10", "gwei").toString()

    expect(result).toEqual(expected)
  })

  test("getMaxFeePerGas 8 block", async () => {
    const result = getMaxFeePerGas(
      ethers.utils.parseUnits("2", "gwei"),
      ethers.utils.parseUnits("8", "gwei"),
      8
    ).toString()
    const expected = ethers.utils.parseUnits("13131569026", "wei").toString()

    expect(result).toEqual(expected)
  })
})
