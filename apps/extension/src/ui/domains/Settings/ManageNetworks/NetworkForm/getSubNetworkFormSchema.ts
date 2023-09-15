import i18next from "@core/i18nConfig"
import * as yup from "yup"

import { getSubstrateRpcInfo } from "./helpers"

export const getSubNetworkFormSchema = (genesisHash?: string) =>
  yup
    .object({
      id: yup.string().required(""),
      isTestnet: yup.boolean().required(),
      genesisHash: yup.string().required(""),
      name: yup.string().required(i18next.t("required")),
      nativeTokenSymbol: yup.string().trim().required(),
      nativeTokenDecimals: yup.number().integer().required(),
      nativeTokenCoingeckoId: yup.string().trim(),
      accountFormat: yup.string().trim().required(i18next.t("required")),
      subscanUrl: yup
        .string()
        .url(i18next.t("invalid url"))
        .optional()
        .test(
          "subscan",
          i18next.t("invalid url"),
          (url) =>
            url === undefined ||
            url.length < 1 ||
            (/^https:\/\//i.test(url) && /\.subscan\.io\/?$/i.test(url))
        ),
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
          let target = genesisHash
          for (const rpc of rpcs) {
            try {
              if (!rpc.url) continue
              const rpcInfo = await getSubstrateRpcInfo(rpc.url)
              if (!rpcInfo?.genesisHash)
                return this.createError({
                  message: i18next.t("Failed to connect"),
                  path: `rpcs[${rpcs.indexOf(rpc)}].url`,
                })
              if (!target) target = rpcInfo.genesisHash
              if (rpcInfo.genesisHash !== target)
                return this.createError({
                  message: i18next.t("Genesis hash mismatch"),
                  path: `rpcs[${rpcs.indexOf(rpc)}].url`,
                })
            } catch (error) {
              return this.createError({
                message: i18next.t("Failed to connect"),
                path: `rpcs[${rpcs.indexOf(rpc)}].url`,
              })
            }
          }
          return true
        }),
    })
    .required()
