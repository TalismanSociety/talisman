import type { TransferFeeConfig } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import { describe, expect, it } from "vitest"

import { calculateToken2022TransferFee } from "./getTransferCallData"

const publicKey = new PublicKey("11111111111111111111111111111111")

const makeTransferFeeConfig = (
  olderTransferFee: TransferFeeConfig["olderTransferFee"],
  newerTransferFee: TransferFeeConfig["newerTransferFee"]
): TransferFeeConfig => ({
  transferFeeConfigAuthority: publicKey,
  withdrawWithheldAuthority: publicKey,
  withheldAmount: 0n,
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
