import type { TransferFee } from "@solana-program/token-2022"
import { describe, expect, it } from "vitest"

import { calculateToken2022TransferFee } from "./getTransferCallData"

const makeTransferFeeConfig = (olderTransferFee: TransferFee, newerTransferFee: TransferFee) => ({
  olderTransferFee,
  newerTransferFee,
})

describe("calculateToken2022TransferFee", () => {
  it("rounds up fractional basis-point fees", () => {
    const transferFeeConfig = makeTransferFeeConfig(
      { epoch: 0n, maximumFee: 10_000n, transferFeeBasisPoints: 100 },
      { epoch: 10n, maximumFee: 10_000n, transferFeeBasisPoints: 100 }
    )

    expect(calculateToken2022TransferFee(transferFeeConfig, 0n, 101n)).toBe(2n)
  })

  it("uses the older fee before the newer fee epoch", () => {
    const transferFeeConfig = makeTransferFeeConfig(
      { epoch: 0n, maximumFee: 10_000n, transferFeeBasisPoints: 100 },
      { epoch: 10n, maximumFee: 10_000n, transferFeeBasisPoints: 1_000 }
    )

    expect(calculateToken2022TransferFee(transferFeeConfig, 9n, 101n)).toBe(2n)
  })

  it("uses the newer fee once its epoch is active", () => {
    const transferFeeConfig = makeTransferFeeConfig(
      { epoch: 0n, maximumFee: 10_000n, transferFeeBasisPoints: 100 },
      { epoch: 10n, maximumFee: 10_000n, transferFeeBasisPoints: 1_000 }
    )

    expect(calculateToken2022TransferFee(transferFeeConfig, 10n, 101n)).toBe(11n)
  })

  it("caps fees at the configured maximum", () => {
    const transferFeeConfig = makeTransferFeeConfig(
      { epoch: 0n, maximumFee: 7n, transferFeeBasisPoints: 10_000 },
      { epoch: 10n, maximumFee: 10_000n, transferFeeBasisPoints: 100 }
    )

    expect(calculateToken2022TransferFee(transferFeeConfig, 0n, 100n)).toBe(7n)
  })
})
