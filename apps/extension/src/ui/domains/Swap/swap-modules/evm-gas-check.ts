import type { TokenId } from "@talismn/chaindata-provider"
import type { PublicClient, TransactionRequest } from "viem"

export class InsufficientGasBalanceError extends Error {
  constructor(
    public readonly feeTokenId: TokenId,
    /** Worst-case cost in planck: value + gas * maxFeePerGas. */
    public readonly required: bigint,
    /** Sender's native balance in planck. */
    public readonly available: bigint
  ) {
    super("Insufficient balance to pay for gas")
    this.name = "InsufficientGasBalanceError"
  }
}

type PrepareRequest = {
  account: `0x${string}`
  to: `0x${string}`
  data?: `0x${string}`
  value?: bigint
  chain: null
  gasLimit?: string
}

/**
 * Wraps `prepareTransactionRequest` to diagnose gas-affordability failures.
 *
 * Nodes estimate gas with the fee caps applied, which limits the allowed gas to
 * `balance / maxFeePerGas`. When the sender cannot afford worst-case gas, the
 * transaction runs out of gas mid-execution and estimation fails with a bare
 * "execution reverted" instead of an explicit insufficient-funds error.
 *
 * On failure, compare the sender's balance against the request:
 * - if the value alone exceeds the balance, throw {@link InsufficientGasBalanceError}
 * - otherwise re-estimate without fee fields (which skips the affordability cap):
 * - if that also fails, the revert is genuine → rethrow the original error
 * - if it succeeds but the sender cannot cover `value + gas * maxFeePerGas`,
 *   throw {@link InsufficientGasBalanceError} so the UI can show a proper hint
 */
export async function prepareTransactionRequestWithGasCheck(
  publicClient: PublicClient,
  feeTokenId: TokenId,
  request: PrepareRequest
): Promise<TransactionRequest> {
  try {
    return (await publicClient.prepareTransactionRequest(request)) as TransactionRequest
  } catch (originalError) {
    await throwIfCannotAffordGas(publicClient, feeTokenId, request)
    throw originalError
  }
}

async function throwIfCannotAffordGas(
  publicClient: PublicClient,
  feeTokenId: TokenId,
  request: PrepareRequest
): Promise<void> {
  const value = request.value ?? 0n

  let available: bigint
  try {
    available = await publicClient.getBalance({ address: request.account })
  } catch {
    return
  }

  if (value > available) throw new InsufficientGasBalanceError(feeTokenId, value, available)

  let required: bigint
  try {
    const [gas, fees] = await Promise.all([
      publicClient.estimateGas({
        account: request.account,
        to: request.to,
        data: request.data,
        value,
      }),
      publicClient.estimateFeesPerGas(),
    ])

    const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice
    if (!maxFeePerGas) return

    required = value + gas * maxFeePerGas
  } catch {
    // diagnostic itself failed (e.g. a genuine revert) - let the caller rethrow the original error
    return
  }

  if (required > available) throw new InsufficientGasBalanceError(feeTokenId, required, available)
}
