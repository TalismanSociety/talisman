import RpcFactory from "@core/libs/RpcFactory"
import { TransactionDetails } from "@core/types"
import { InterfaceTypes } from "@polkadot/types/types/registry"
import * as Sentry from "@sentry/browser"

const tryRpcSend = async (chainId: string, method: string, attempts: number, params: unknown[]) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await RpcFactory.send(chainId, method, params)
    } catch (err) {
      if (i === attempts) throw err
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
}

export const getTransactionDetails = async (
  chainId: string,
  extrinsic: InterfaceTypes["Extrinsic"],
  at?: string
) => {
  const result = extrinsic.toHuman() as any
  result.method.meta = extrinsic.meta.toHuman()
  result.isBatch = ["utility.batch", "utility.batchAll"].includes(
    `${result.method.section}.${result.method.method}`
  )

  if (result.isBatch) {
    result.batch = extrinsic.method.args[0].toHuman()
    const calls = extrinsic.method.args[0] as unknown as Array<InterfaceTypes["Call"]>

    result.batch = calls.map((call) => ({
      ...call.toHuman(),
      meta: call.meta.toHuman(),
    }))
  }

  try {
    // estimate fees (attempt 3 times)
    result.payment = await tryRpcSend(chainId, "payment_queryInfo", 3, [extrinsic.toHex(), at])
  } catch (err) {
    Sentry.captureException(err)
  }

  return result as TransactionDetails
}
