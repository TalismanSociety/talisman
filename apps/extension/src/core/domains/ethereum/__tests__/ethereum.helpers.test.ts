import { parseGwei } from "viem"
import { describe, expect, test } from "vitest"
import {
  getEthDerivationPath,
  getEthLedgerDerivationPath,
  getGasLimit,
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

    // effectiveFeePerGas = min(1.5 GWEI, 2 + 0.5 GWEI) = 1.5 GWEI (capped at maxFeePerGas)
    expect(estimatedFee).toEqual(31500000000000n)
    // maxFee = maxFeePerGas * gas = 1.5 GWEI * 22000
    expect(maxFee).toEqual(33000000000000n)
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

    // effectiveFeePerGas = min(3.5 GWEI, 2 + 0.5 GWEI) = 2.5 GWEI
    expect(estimatedFee).toEqual(52500000000000n)
    // maxFee = maxFeePerGas * gas = 3.5 GWEI * 22000
    expect(maxFee).toEqual(77000000000000n)
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
    expect(getEthDerivationPath()).toEqual("m/44'/60'/0'/0/0")
    expect(getEthDerivationPath(3)).toEqual("m/44'/60'/0'/0/3")
  })

  test("getEthLedgerDerivationPath", () => {
    expect(getEthLedgerDerivationPath("LedgerLive")).toEqual("m/44'/60'/0'/0/0")
    expect(getEthLedgerDerivationPath("LedgerLive", 3)).toEqual("m/44'/60'/3'/0/0")

    expect(getEthLedgerDerivationPath("Legacy")).toEqual("m/44'/60'/0'/0")
    expect(getEthLedgerDerivationPath("Legacy", 3)).toEqual("m/44'/60'/0'/3")

    expect(getEthLedgerDerivationPath("BIP44")).toEqual("m/44'/60'/0'/0/0")
    expect(getEthLedgerDerivationPath("BIP44", 3)).toEqual("m/44'/60'/0'/0/3")
  })

  test("getGasLimit - simple transfer (no buffer)", () => {
    const result = getGasLimit(30000000n, 21000n, undefined, false)
    expect(result).toEqual(21000n)
  })

  test("getGasLimit - contract call (1.5× buffer)", () => {
    const result = getGasLimit(30000000n, 100000n, undefined, true)
    // 100000 * 150 / 100 = 150000
    expect(result).toEqual(150000n)
  })

  test("getGasLimit - dapp suggests higher gas than buffered estimate", () => {
    const result = getGasLimit(30000000n, 50000n, { gas: 80000n } as never, true)
    // buffered = 50000 * 1.5 = 75000, dapp suggests 80000 → use 80000
    expect(result).toEqual(80000n)
  })

  test("getGasLimit - capped at 90% of block gas limit", () => {
    const result = getGasLimit(100000n, 70000n, undefined, true)
    // buffered = 70000 * 1.5 = 105000, 90% cap = 90000 → use 90000
    expect(result).toEqual(90000n)
  })

  test("getGasLimit - below minimum falls back to default", () => {
    const result = getGasLimit(30000000n, 100n, undefined, false)
    // 100 < 21000 minimum → fallback to 250000
    expect(result).toEqual(250000n)
  })

  test("isSafeImageUrl", () => {
    expect(isSafeImageUrl("https://localhost/anysvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://127.0.0.1/anysvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://192.168.0.1/anysvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://172.19.0.1/anysvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://10.0.0.1/anysvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("https://legit-domain:666/anysvgfile_(1).svg")).toEqual(false)
    expect(isSafeImageUrl("http://legit-domain/anysvgfile_(1).svg")).toEqual(false) // uses http
    expect(isSafeImageUrl("https://legit-domain/anysvgfile_(1).js")).toEqual(false)
    expect(isSafeImageUrl("https://legit-domain/anysvgfile_(1).svg")).toEqual(true)
  })
})
