import type { PublicClient } from "viem"
import { describe, expect, it, vi } from "vitest"
import {
  InsufficientGasBalanceError,
  prepareTransactionRequestWithGasCheck,
} from "../evm-gas-check"

const request = {
  chain: null,
  account: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  to: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  data: "0xa9059cbb",
  value: 0n,
} as const

const bareRevert = new Error("Execution reverted for an unknown reason.")

const GAS = 60_000n
const LOW_FEE = 40_000_000n // 0.04 gwei
const HIGH_FEE = 40_000_000_000n // 40 gwei
const BALANCE = 3_000_000_000_000n // covers GAS * LOW_FEE, not GAS * HIGH_FEE

const makeClient = (overrides: Partial<Record<string, unknown>>) =>
  ({
    prepareTransactionRequest: vi.fn().mockRejectedValue(bareRevert),
    estimateGas: vi.fn().mockResolvedValue(GAS),
    estimateFeesPerGas: vi
      .fn()
      .mockResolvedValue({ maxFeePerGas: LOW_FEE, maxPriorityFeePerGas: 0n }),
    getBalance: vi.fn().mockResolvedValue(BALANCE),
    ...overrides,
  }) as unknown as PublicClient

describe("prepareTransactionRequestWithGasCheck", () => {
  it("returns the prepared request when estimation succeeds", async () => {
    const prepared = { gas: GAS }
    const client = makeClient({
      prepareTransactionRequest: vi.fn().mockResolvedValue(prepared),
    })

    await expect(
      prepareTransactionRequestWithGasCheck(client, "evm-native-42161", request)
    ).resolves.toBe(prepared)
    expect(client.estimateGas).not.toHaveBeenCalled()
  })

  it("throws InsufficientGasBalanceError when sender cannot afford worst-case gas", async () => {
    const client = makeClient({
      estimateFeesPerGas: vi
        .fn()
        .mockResolvedValue({ maxFeePerGas: HIGH_FEE, maxPriorityFeePerGas: 0n }),
    })

    const error = await prepareTransactionRequestWithGasCheck(
      client,
      "evm-native-42161",
      request
    ).catch((e) => e)

    expect(error).toBeInstanceOf(InsufficientGasBalanceError)
    expect(error.feeTokenId).toBe("evm-native-42161")
    expect(error.required).toBe(GAS * HIGH_FEE)
    expect(error.available).toBe(BALANCE)
  })

  it("includes the transfer value in the required amount", async () => {
    const client = makeClient({})

    const error = await prepareTransactionRequestWithGasCheck(client, "evm-native-42161", {
      ...request,
      data: undefined,
      value: BALANCE,
    }).catch((e) => e)

    expect(error).toBeInstanceOf(InsufficientGasBalanceError)
    expect(error.required).toBe(BALANCE + GAS * LOW_FEE)
  })

  it("rethrows the original error on a genuine revert", async () => {
    const client = makeClient({
      estimateGas: vi.fn().mockRejectedValue(new Error("ERC20: transfer amount exceeds balance")),
    })

    await expect(
      prepareTransactionRequestWithGasCheck(client, "evm-native-42161", request)
    ).rejects.toBe(bareRevert)
  })

  it("rethrows the original error when the sender can afford gas", async () => {
    const client = makeClient({
      getBalance: vi.fn().mockResolvedValue(10n ** 18n),
    })

    await expect(
      prepareTransactionRequestWithGasCheck(client, "evm-native-42161", request)
    ).rejects.toBe(bareRevert)
  })

  it("falls back to gasPrice on legacy fee networks", async () => {
    const client = makeClient({
      estimateFeesPerGas: vi.fn().mockResolvedValue({ gasPrice: HIGH_FEE }),
    })

    const error = await prepareTransactionRequestWithGasCheck(
      client,
      "evm-native-42161",
      request
    ).catch((e) => e)

    expect(error).toBeInstanceOf(InsufficientGasBalanceError)
    expect(error.required).toBe(GAS * HIGH_FEE)
  })
})
