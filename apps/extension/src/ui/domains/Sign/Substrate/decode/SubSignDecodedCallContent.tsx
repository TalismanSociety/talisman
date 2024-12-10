import { LoaderIcon } from "@talismn/icons"
import { classNames, encodeAnyAddress } from "@talismn/util"
import DOMPurify from "dompurify"
import { SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"
import htmlParser from "html-react-parser"
import { dump as convertToYaml } from "js-yaml"
import { marked } from "marked"
import { Binary } from "polkadot-api"
import { FC, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { CodeBlock } from "@talisman/components/CodeBlock"
import { FallbackErrorBoundary } from "@talisman/components/FallbackErrorBoundary"
import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { SubSignDecodedCallSummaryBlock } from "./SubSignDecodedCallSummaryBlock"

export const SubSignDecodedCallContent: FC<{
  decodedCall: DecodedCall
  sapi: ScaleApi
  payload: SignerPayloadJSON
}> = ({ decodedCall, sapi, payload }) => (
  <FallbackErrorBoundary fallback={<ErrorFallback decodedCall={decodedCall} sapi={sapi} />}>
    <Suspense fallback={<LoadingShimmer />}>
      <div className="text-body-secondary flex flex-col gap-4 text-sm">
        {/* Summary can suspense to fetch additional data, and break if a chain uses incompatible types */}
        <SubSignDecodedCallSummaryBlock decodedCall={decodedCall} sapi={sapi} payload={payload} />
        <DefaultView decodedCall={decodedCall} sapi={sapi} />
      </div>
    </Suspense>
  </FallbackErrorBoundary>
)

const ErrorFallback: FC<{
  decodedCall: DecodedCall
  sapi: ScaleApi
}> = ({ decodedCall, sapi }) => (
  <div className="text-body-secondary flex flex-col gap-4 text-sm">
    <DefaultView decodedCall={decodedCall} sapi={sapi} />
  </div>
)

const DefaultView: FC<{
  decodedCall: DecodedCall
  sapi: ScaleApi
}> = ({ decodedCall, sapi }) => {
  const { t } = useTranslation()

  const yamlArgs = useMemo(() => {
    try {
      log.debug("formatArgs(decodedCall.args)", {
        args: decodedCall.args,
        formatted: formatArgs(decodedCall.args),
      })
      return convertToYaml(formatArgs(decodedCall.args), {
        skipInvalid: true,
      })
    } catch (err) {
      log.error("Failed to convert call args to yaml", { err, decodedCall })
      return null
    }
  }, [decodedCall])

  const docs = useMemo(() => {
    const rawDocs = sapi?.getCallDocs(decodedCall.pallet, decodedCall.method) ?? null
    if (!rawDocs) return null
    try {
      return DOMPurify.sanitize(marked(rawDocs, { gfm: true, async: false }) as string)
    } catch (err) {
      log.warn("Failed to parse docs", { err, decodedCall, rawDocs })
      return null
    }
  }, [sapi, decodedCall])

  return (
    <>
      <div className="flex w-full justify-between gap-8">
        <div>{t("Pallet")}</div>
        <div className="text-body truncate">{decodedCall.pallet}</div>
      </div>
      <div className="flex w-full justify-between gap-8">
        <div>{t("Method")}</div>
        <div className="text-body truncate">{decodedCall.method}</div>
      </div>
      {!!yamlArgs && (
        <>
          <div>{t("Arguments")}</div>
          <div>
            <CodeBlock code={yamlArgs} className="bg-grey-850 rounded text-sm" />
          </div>
        </>
      )}
      {!!docs && (
        <>
          <div className="mt-4">{t("Documentation")}</div>
          <div
            className={classNames(
              "flex w-full flex-col gap-2 overflow-hidden !text-xs",
              "[&_code]:text-body [&_em]:text-body [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_ul]:list-disc [&_ul]:pl-10",
              "[overflow-wrap:anywhere]",
            )}
          >
            {htmlParser(docs)}
          </div>
        </>
      )}
    </>
  )
}

const LoadingShimmer = () => {
  const { t } = useTranslation("request")

  return (
    <div className="text-body-secondary animate-fade-in flex flex-col items-center gap-2 pt-40 leading-[140%]">
      <LoaderIcon className="animate-spin-slow h-14 w-14" />
      <div className="mt-4 text-sm font-bold text-white opacity-70">{t("Analysing request")}</div>
    </div>
  )
}

const formatArgs = (args: unknown): unknown => {
  if (args === undefined) return args
  if (args === null) return args
  if (typeof args === "boolean") return args.toString()
  if (typeof args === "string") return args
  if (typeof args === "number") return args
  if (typeof args === "bigint") return args.toString() + "n"
  if (Array.isArray(args)) return args.map(formatArgs)

  // TODO fallback to asHex if any weird characters are present
  if (args instanceof Binary) return args.asText()

  if (typeof args === "object") {
    // workaround for AccountId32 - asText() returns glyphs so we need to decode it manually
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyArgs = args as any
    if (anyArgs.type === "AccountId32" && anyArgs.value.id)
      return {
        type: "AccountId32",
        value: encodeAnyAddress(anyArgs.value.id.asBytes()),
      }

    // workaround - cant detect type of FixedSizeBinary programmatically
    if ("asHex" in args && typeof args.asHex === "function") return args.asHex()

    //console.log("decodedArgs Object", { args })
    const obj = args as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, formatArgs(v)]),
    )
  }

  return "UNKNOWN"
}
