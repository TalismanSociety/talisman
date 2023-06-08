import i18next from "@ui/i18nConfig"
import * as yup from "yup"

import { getRpcChainId } from "./helpers"

export const getNetworkFormSchema = (evmNetworkId?: string) => {
  return yup
    .object({
      id: yup.string().required(""),
      name: yup.string().required(i18next.t("required")),
      rpcs: yup
        .array()
        .of(
          yup.object({
            url: yup
              .string()
              .trim()
              .required(i18next.t("required"))
              .test("rpcmatch", "rpcCheck", async function (newRpc) {
                if (!evmNetworkId || !newRpc) return true
                try {
                  const chainId = await getRpcChainId(newRpc as string)
                  if (!chainId) return this.createError({ message: i18next.t("Failed to connect") })
                  if (evmNetworkId !== chainId)
                    return this.createError({ message: i18next.t("Chain ID mismatch") })
                  return true
                } catch (err) {
                  return this.createError({ message: i18next.t("Failed to connect") })
                }
              }),
          })
        )
        .required(i18next.t("required"))
        .min(1, i18next.t("RPC URL required")),
      tokenSymbol: yup
        .string()
        .trim()
        .required(i18next.t("required"))
        .min(2, i18next.t("2-6 characters"))
        .max(6, i18next.t("2-6 characters")),
      tokenDecimals: yup
        .number()
        .typeError(i18next.t("invalid number"))
        .required(i18next.t("required"))
        .integer(i18next.t("invalid number")),
      blockExplorerUrl: yup.string().url(i18next.t("invalid url")),
      isTestnet: yup.boolean().required(),
    })
    .required()
}
