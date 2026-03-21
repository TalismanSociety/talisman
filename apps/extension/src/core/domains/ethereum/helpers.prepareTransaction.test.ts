import type { TransactionRequest } from "viem"
import { describe, expect, it } from "vitest"
import { normalizeTransactionFeeModel } from "./helpers"
import type { EthGasSettingsEip1559, EthGasSettingsLegacy } from "./types"

const from = "0x1111111111111111111111111111111111111111" as const
const to = "0x2222222222222222222222222222222222222222" as const

describe("normalizeTransactionFeeModel", () => {
  it("drops eip1559 fee fields when normalizing a legacy transaction", () => {
    const legacySettings: EthGasSettingsLegacy = {
      type: "legacy",
      gas: 21000n,
      gasPrice: 3_000_000_000n,
    }

    const tx: TransactionRequest = { from, to, value: 1n, nonce: 5 }
    Object.assign(tx, {
      type: "eip1559",
      maxFeePerGas: 50_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
      gasPrice: 8_000_000_000n,
    })
    const normalized = normalizeTransactionFeeModel(tx, legacySettings)

    expect(normalized.type).toBeUndefined()
    expect(normalized.gasPrice).toBe(8_000_000_000n)
    expect(normalized.maxFeePerGas).toBeUndefined()
    expect(normalized.maxPriorityFeePerGas).toBeUndefined()
  })

  it("drops gasPrice when normalizing an eip1559 transaction", () => {
    const eip1559Settings: EthGasSettingsEip1559 = {
      type: "eip1559",
      gas: 25000n,
      maxFeePerGas: 20_000_000_000n,
      maxPriorityFeePerGas: 1_500_000_000n,
    }

    const tx: TransactionRequest = { from, to, value: 2n, nonce: 9 }
    Object.assign(tx, {
      type: "legacy",
      gasPrice: 3_000_000_000n,
      maxFeePerGas: 21_000_000_000n,
      maxPriorityFeePerGas: 1_700_000_000n,
    })
    const normalized = normalizeTransactionFeeModel(tx, eip1559Settings)

    expect(normalized.type).toBe("eip1559")
    expect(normalized.gasPrice).toBeUndefined()
    expect(normalized.maxFeePerGas).toBe(21_000_000_000n)
    expect(normalized.maxPriorityFeePerGas).toBe(1_700_000_000n)
  })

  it("keeps eip2930 type for legacy gas settings", () => {
    const legacySettings: EthGasSettingsLegacy = {
      type: "legacy",
      gas: 30000n,
      gasPrice: 4_000_000_000n,
    }

    const tx: TransactionRequest = { from, to, nonce: 12, type: "eip2930" }
    Object.assign(tx, {
      maxFeePerGas: 20_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    })
    const normalized = normalizeTransactionFeeModel(tx, legacySettings)

    expect(normalized.type).toBe("eip2930")
    expect(normalized.gasPrice).toBeUndefined()
    expect(normalized.maxFeePerGas).toBeUndefined()
    expect(normalized.maxPriorityFeePerGas).toBeUndefined()
  })
})
