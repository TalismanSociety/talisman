import { ethers } from "ethers"

import {
  getEip1559TotalFees,
  getEthDerivationPath,
  getEthLedgerDerivationPath,
  getLegacyTotalFees,
  getMaxFeePerGas,
} from "../helpers"

const baseFeePerGas = ethers.utils.parseUnits("2", "gwei")
const maxPriorityFeePerGas = ethers.utils.parseUnits("8", "gwei")

describe("Test ethereum helpers", () => {
  test("getMaxFeePerGas 0 block", async () => {
    const result = getMaxFeePerGas(baseFeePerGas, maxPriorityFeePerGas, 0).toString()
    const expected = ethers.utils.parseUnits("10", "gwei").toString()

    expect(result).toEqual(expected)
  })

  test("getMaxFeePerGas 8 block", async () => {
    const result = getMaxFeePerGas(baseFeePerGas, maxPriorityFeePerGas, 8).toString()
    const expected = ethers.utils.parseUnits("13131569026", "wei").toString()

    expect(result).toEqual(expected)
  })

  test("getEip1559TotalFees", () => {
    const { estimatedFee, maxFee } = getEip1559TotalFees(
      21000,
      22000,
      baseFeePerGas,
      maxPriorityFeePerGas
    )

    const expectedEstimatedFee = ethers.utils.parseUnits("210000", "gwei").toString()
    const expectedMaxFee = ethers.utils.parseUnits("288894518572000", "wei").toString()

    expect(estimatedFee.toString()).toEqual(expectedEstimatedFee)
    expect(maxFee.toString()).toEqual(expectedMaxFee)
  })

  test("getLegacyTotalFees", () => {
    const { estimatedFee, maxFee } = getLegacyTotalFees(
      21000,
      22000,
      baseFeePerGas.add(maxPriorityFeePerGas)
    )

    const expectedEstimatedFee = ethers.utils.parseUnits("210000", "gwei").toString()
    const expectedMaxFee = ethers.utils.parseUnits("220000", "gwei").toString()

    expect(estimatedFee.toString()).toEqual(expectedEstimatedFee)
    expect(maxFee.toString()).toEqual(expectedMaxFee)
  })

  test("getEthDerivationPath", () => {
    expect(getEthDerivationPath()).toEqual("/m/44'/60'/0'/0/0")
    expect(getEthDerivationPath(3)).toEqual("/m/44'/60'/0'/0/3")
  })

  test("getEthLedgerDerivationPath", () => {
    expect(getEthLedgerDerivationPath("LedgerLive")).toEqual("m/44'/60'/0'/0/0")
    expect(getEthLedgerDerivationPath("LedgerLive", 3)).toEqual("m/44'/60'/3'/0/0")

    expect(getEthLedgerDerivationPath("Legacy")).toEqual("m/44'/60'/0'/0")
    expect(getEthLedgerDerivationPath("Legacy", 3)).toEqual("m/44'/60'/0'/3")

    expect(getEthLedgerDerivationPath("BIP44")).toEqual("m/44'/60'/0'/0/0")
    expect(getEthLedgerDerivationPath("BIP44", 3)).toEqual("m/44'/60'/0'/0/3")
  })
})
