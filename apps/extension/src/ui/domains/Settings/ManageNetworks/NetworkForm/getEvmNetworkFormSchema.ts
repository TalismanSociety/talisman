import i18next from "@core/i18nConfig"
import * as yup from "yup"

import { getEvmRpcChainId } from "./helpers"

export const getEvmNetworkFormSchema = (evmNetworkId?: string) =>
  yup
    .object({
      id: yup.string().required(""),
      name: yup.string().required(i18next.t("required")),
      rpcs: yup
        .array()
        .of(
          yup.object({
            url: yup.string().trim().required(i18next.t("required")),
          })
        )
        .required(i18next.t("required"))
        .min(1, i18next.t("RPC URL required"))
        .test("rpcs", i18next.t("Chain ID mismatch"), async function (rpcs) {
          if (!rpcs?.length) return true
          let targetId = evmNetworkId
          for (const rpc of rpcs) {
            try {
              if (!rpc.url) continue
              const chainId = await getEvmRpcChainId(rpc.url)
              if (!chainId)
                return this.createError({
                  message: i18next.t("Failed to connect"),
                  path: `rpcs[${rpcs.indexOf(rpc)}].url`,
                })
              if (!targetId) targetId = chainId
              if (chainId !== targetId)
                return this.createError({
                  message: i18next.t("Chain ID mismatch"),
                  path: `rpcs[${rpcs.indexOf(rpc)}].url`,
                })
            } catch (err) {
              return this.createError({
                message: i18next.t("Failed to connect"),
                path: `rpcs[${rpcs.indexOf(rpc)}].url`,
              })
            }
          }
          return true
        }),
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
