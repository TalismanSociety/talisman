import i18next from "@core/i18nConfig"
import * as yup from "yup"

import { getSubstrateRpcInfo } from "./helpers"

export const getSubNetworkFormSchema = (genesisHash?: string) =>
  yup
    .object({
      id: yup.string().required(""),
      isTestnet: yup.boolean().required(),
      genesisHash: yup.string().required(""),
      name: yup.string().required(i18next.t("Required")),
      nativeTokenSymbol: yup.string().trim().required(i18next.t("Required")),
      nativeTokenDecimals: yup
        .number()
        .typeError(i18next.t("Must be a number"))
        .required(i18next.t("Required"))
        .integer(i18next.t("Must be a number")),
      nativeTokenCoingeckoId: yup.string().trim(),
      accountFormat: yup.string().trim().required(i18next.t("Required")),
      subscanUrl: yup
        .string()
        .url(i18next.t("Invalid URL"))
        .optional()
        .test(
          "subscan",
          i18next.t("Invalid URL"),
          (url) =>
            url === undefined ||
            url.length < 1 ||
            (/^https:\/\//i.test(url) && /\.subscan\.io\/?$/i.test(url))
        ),
      rpcs: yup
        .array()
        .of(yup.object({ url: yup.string().trim().required(i18next.t("Required")) }))
        .required(i18next.t("Required"))
        .min(1, i18next.t("RPC URL required"))
        .test("rpcs-unique", i18next.t("Must be unique"), function (rpcs) {
          if (!rpcs?.length) return true
          const urls = rpcs.map((rpc) => rpc.url)
          const duplicate = urls.filter((url, i) => {
            const prevUrls = urls.slice(0, i)
            return prevUrls.includes(url)
          })

          if (duplicate.length) {
            return this.createError({
              message: i18next.t("Must be unique"),
              path: `rpcs[${urls.lastIndexOf(duplicate[0])}].url`,
            })
          }

          return true
        })
        .test("rpcs-valid", i18next.t("Genesis hash mismatch"), async function (rpcs) {
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
