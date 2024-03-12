import i18next from "@common/i18nConfig"
import * as yup from "yup"

import { wsRegEx } from "./helpers"

export const subNetworkFormSchema = yup
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
      .of(
        yup.object({
          url: yup
            .string()
            .trim()
            .required(i18next.t("Required"))
            .min(1, i18next.t("RPC URL required"))
            .matches(wsRegEx, i18next.t("Invalid URL")),
          genesisHash: yup.string(),
        })
      )
      .test("rpc-urls-unique", i18next.t("Must be unique"), function (rpcs) {
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
      .test(
        "genesis-hashes-match",
        i18next.t("Incorrect RPC for this chain"),
        (rpcs, testContext) => {
          if (!rpcs?.length || rpcs.length === 1) return true
          // no genesis hash set in the parent yet
          if (!testContext.parent.genesisHash) return true

          const hashes = rpcs.map(({ genesisHash }) => genesisHash)
          const different = hashes.find(
            (genesisHash) => genesisHash && genesisHash !== testContext.parent.genesisHash
          )

          if (different)
            return testContext.createError({
              message: i18next.t("Incorrect RPC for this chain"),
              path: `rpcs[${hashes.lastIndexOf(different)}].url`,
            })
          return true
        }
      ),
  })
  .required()
