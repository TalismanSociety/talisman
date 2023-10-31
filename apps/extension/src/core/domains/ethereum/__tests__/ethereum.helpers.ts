import { ethers } from "ethers"
import { parseGwei } from "viem"

import {
  getEthDerivationPath,
  getEthLedgerDerivationPath,
  getMaxFeePerGas,
  getTotalFeesFromGasSettings,
  isSafeImageUrl,
} from "../helpers"

const baseFeePerGas = parseGwei("2")
const maxPriorityFeePerGas = parseGwei("2")

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

  test("getTotalFeesFromGasSettings - EIP1559 maxFee lower than baseFee", () => {
    const { estimatedFee, maxFee } = getTotalFeesFromGasSettings(
      {
        type: "eip1559",
        maxFeePerGas: parseGwei("1.5"),
        maxPriorityFeePerGas: parseGwei("0.5"),
        gas: 22000n,
      },
      21000n,
      baseFeePerGas
    ) //

    const expectedEstimatedFee = ethers.utils.parseUnits("42000000000000", "wei").toString()
    const expectedMaxFee = ethers.utils.parseUnits("44000000000000", "wei").toString()

    expect(estimatedFee.toString()).toEqual(expectedEstimatedFee)
    expect(maxFee.toString()).toEqual(expectedMaxFee)
  })

  test("getTotalFeesFromGasSettings - EIP1559 classic", () => {
    const { estimatedFee, maxFee } = getTotalFeesFromGasSettings(
      {
        type: "eip1559",
        maxFeePerGas: parseGwei("3.5"),
        maxPriorityFeePerGas: parseGwei("0.5"),
        gas: 22000n,
      },
      21000n,
      baseFeePerGas
    )

    const expectedEstimatedFee = ethers.utils.parseUnits("52500000000000", "wei").toString()
    const expectedMaxFee = ethers.utils.parseUnits("88000000000000", "wei").toString()

    expect(estimatedFee.toString()).toEqual(expectedEstimatedFee)
    expect(maxFee.toString()).toEqual(expectedMaxFee)
  })

  test("getTotalFeesFromGasSettings - Legacy", () => {
    const { estimatedFee, maxFee } = getTotalFeesFromGasSettings(
      {
        type: "legacy",
        gasPrice: baseFeePerGas + maxPriorityFeePerGas,
        gas: 22000n,
      },
      21000n,
      baseFeePerGas
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

  test("isSafeImageUrl", () => {
    expect(isSafeImageUrl("https://localhost/evilsvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://127.0.0.1/evilsvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://192.168.0.1/evilsvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://172.19.0.1/evilsvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://10.0.0.1/evilsvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://legit-domain:666/evilsvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("http://legit-domain/evilsvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://legit-domain/evilsvgfile_(1).js")).toEqual(false)
    expect(isSafeImageUrl("https://legit-domain/chadsvgfile_(1).svg")).toEqual(true)
  })
})
