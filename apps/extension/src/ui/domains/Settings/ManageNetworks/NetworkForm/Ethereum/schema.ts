import i18next from "@common/i18nConfig"
import * as yup from "yup"

import { getEvmRpcChainId } from "./helpers"

export const evmNetworkFormSchema = yup
  .object({
    id: yup.string().required(""),
    isTestnet: yup.boolean().required(),
    name: yup.string().required(i18next.t("Required")),
    tokenSymbol: yup
      .string()
      .trim()
      .required(i18next.t("Required"))
      .min(2, i18next.t("2-6 characters"))
      .max(6, i18next.t("2-6 characters")),
    tokenDecimals: yup
      .number()
      .typeError(i18next.t("Must be a number"))
      .required(i18next.t("Required"))
      .integer(i18next.t("Must be a number")),
    blockExplorerUrl: yup.string().url(i18next.t("Invalid URL")),
    rpcs: yup
      .array()
      .of(
        yup
          .object({ url: yup.string().trim().required(i18next.t("Required")) })
          .test(
            "rpc-valid",
            i18next.t("Chain ID mismatch"),
            async function (rpc, { path, options, createError }) {
              if (!rpc || !rpc.url) return true
              let targetId = options.context?.evmNetworkId as string | undefined
              try {
                const chainId = await getEvmRpcChainId(rpc.url)
                if (!chainId)
                  return createError({
                    message: i18next.t("Failed to connect"),
                    path: `${path}.url`,
                  })
                if (!targetId) targetId = chainId
                if (chainId !== targetId)
                  return createError({
                    message: i18next.t("Chain ID mismatch"),
                    path: `${path}.url`,
                  })
              } catch (error) {
                return createError({
                  message: i18next.t("Failed to connect"),
                  path: `${path}.url`,
                })
              }
              return true
            }
          )
      )
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
      }),
  })
  .required()
