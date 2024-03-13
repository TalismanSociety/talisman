import { parseGwei } from "viem"

import {
  getEthDerivationPath,
  getEthLedgerDerivationPath,
  getMaxFeePerGas,
  getTotalFeesFromGasSettings,
  isSafeImageUrl,
} from "../helpers"

const baseFeePerGas = parseGwei("2")
const maxPriorityFeePerGas = parseGwei("8")

describe("Test ethereum helpers", () => {
  test("getMaxFeePerGas 0 block", async () => {
    const result = getMaxFeePerGas(baseFeePerGas, maxPriorityFeePerGas, 0)
    const expected = parseGwei("10")

    expect(result).toEqual(expected)
  })

  test("getMaxFeePerGas 8 block", async () => {
    const result = getMaxFeePerGas(baseFeePerGas, maxPriorityFeePerGas, 8)

    expect(result).toEqual(13131569026n)
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
      baseFeePerGas,
      0n
    )

    expect(estimatedFee).toEqual(42000000000000n)
    expect(maxFee).toEqual(44000000000000n)
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
      baseFeePerGas,
      0n
    )

    expect(estimatedFee).toEqual(52500000000000n)
    expect(maxFee).toEqual(88000000000000n)
  })

  test("getTotalFeesFromGasSettings - Legacy", () => {
    const { estimatedFee, maxFee } = getTotalFeesFromGasSettings(
      {
        type: "legacy",
        gasPrice: baseFeePerGas + maxPriorityFeePerGas,
        gas: 22000n,
      },
      21000n,
      baseFeePerGas,
      0n
    )

    expect(estimatedFee).toEqual(parseGwei("210000"))
    expect(maxFee).toEqual(parseGwei("220000"))
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
