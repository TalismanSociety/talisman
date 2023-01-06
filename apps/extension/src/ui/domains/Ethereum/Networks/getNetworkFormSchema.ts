import * as yup from "yup"

import { getRpcChainId } from "./helpers"

export const getNetworkFormSchema = (evmNetworkId?: string) => {
  return yup
    .object({
      id: yup.string().required(""),
      name: yup.string().required("required"),
      rpcs: yup
        .array()
        .of(
          yup.object({
            url: yup
              .string()
              .trim()
              .required("required")
              .test("rpcmatch", "rpcCheck", async function (newRpc) {
                if (!evmNetworkId || !newRpc) return true
                try {
                  const chainId = await getRpcChainId(newRpc as string)
                  if (!chainId) return this.createError({ message: "Failed to connect" })
                  if (evmNetworkId !== chainId)
                    return this.createError({ message: "Chain ID mismatch" })
                  return true
                } catch (err) {
                  return this.createError({ message: "Failed to connect" })
                }
              }),
          })
        )
        .required("required")
        .min(1, "RPC URL required"),
      tokenSymbol: yup
        .string()
        .trim()
        .required("required")
        .min(2, "2-6 characters")
        .max(6, "2-6 characters"),
      tokenDecimals: yup
        .number()
        .typeError("invalid number")
        .required("required")
        .integer("invalid number"),
      blockExplorerUrl: yup.string().url("invalid url"),
      isTestnet: yup.boolean().required(),
    })
    .required()
}
