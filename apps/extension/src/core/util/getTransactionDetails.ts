import { TransactionDetails } from "@core/domains/signing/types"
import { InterfaceTypes } from "@polkadot/types/types/registry"
import { HexString } from "@polkadot/util/types"
import * as Sentry from "@sentry/browser"
import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"

export const getTransactionDetails = async (
  chainId: string,
  extrinsic: InterfaceTypes["Extrinsic"],
  at?: HexString
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
    result.payment = await getExtrinsicDispatchInfo(chainId, extrinsic, at)
  } catch (err) {
    Sentry.captureException(err)
  }

  return result as TransactionDetails
}
