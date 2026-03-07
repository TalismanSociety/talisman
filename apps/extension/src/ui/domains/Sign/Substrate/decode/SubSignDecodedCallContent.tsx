import { log } from "@common/log"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { CodeBlock } from "@talisman/components/CodeBlock"
import { FallbackErrorBoundary } from "@talisman/components/FallbackErrorBoundary"
import { encodeAddressSs58 } from "@talismn/crypto"
import { LoaderIcon } from "@talismn/icons"
import type { DecodedCall, ScaleApi } from "@talismn/sapi"
import { classNames, isAscii } from "@talismn/util"
import DOMPurify from "dompurify"
import htmlParser from "html-react-parser"
import { dump as convertToYaml } from "js-yaml"
import { marked } from "marked"
import { Binary } from "polkadot-api"
import { type FC, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SubSignDecodedCallSummaryBlock } from "./SubSignDecodedCallSummaryBlock"

export const SubSignDecodedCallContent: FC<{
  decodedCall: DecodedCall
  sapi: ScaleApi
  payload: SignerPayloadJSON
}> = ({ decodedCall, sapi, payload }) => (
  <FallbackErrorBoundary fallback={<ErrorFallback decodedCall={decodedCall} sapi={sapi} />}>
    <Suspense fallback={<LoadingShimmer />}>
      <div className="flex flex-col gap-4 text-body-secondary text-sm">
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
  <div className="flex flex-col gap-4 text-body-secondary text-sm">
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
        <div className="truncate text-body">{decodedCall.pallet}</div>
      </div>
      <div className="flex w-full justify-between gap-8">
        <div>{t("Method")}</div>
        <div className="truncate text-body">{decodedCall.method}</div>
      </div>
      {!!yamlArgs && (
        <>
          <div>{t("Arguments")}</div>
          <div>
            <CodeBlock code={yamlArgs} className="rounded bg-grey-850 text-sm" />
          </div>
        </>
      )}
      {!!docs && (
        <>
          <div className="mt-4">{t("Documentation")}</div>
          <div
            className={classNames(
              "!text-xs flex w-full flex-col gap-2 overflow-hidden",
              "[&_code]:text-body [&_em]:text-body [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_ul]:list-disc [&_ul]:pl-10",
              "[overflow-wrap:anywhere]"
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
  const { t } = useTranslation()

  return (
    <div className="flex animate-fade-in flex-col items-center gap-2 pt-40 text-body-secondary leading-[140%]">
      <LoaderIcon className="h-14 w-14 animate-spin-slow" />
      <div className="mt-4 font-bold text-sm text-white opacity-70">{t("Analysing request")}</div>
    </div>
  )
}

const formatArgs = (args: unknown): unknown => {
  if (args === undefined) return args
  if (args === null) return args
  if (typeof args === "boolean") return args.toString()
  if (typeof args === "string") return args
  if (typeof args === "number") return args
  if (typeof args === "bigint") return `${args.toString()}n`
  if (Array.isArray(args)) return args.map(formatArgs)

  if (args instanceof Binary) {
    const text = args.asText()
    return isAscii(text) ? text : args.asHex()
  }

  if (typeof args === "object") {
    // workaround for AccountId32 - asText() returns glyphs so we need to decode it manually
    // biome-ignore lint/suspicious/noExplicitAny: legacy
    const anyArgs = args as any
    if (anyArgs.type === "AccountId32" && anyArgs.value.id)
      return {
        type: "AccountId32",
        value: encodeAddressSs58(anyArgs.value.id.asBytes()),
      }

    // workaround - cant detect type of FixedSizeBinary programmatically
    if ("asHex" in args && typeof args.asHex === "function") return args.asHex()

    //console.log("decodedArgs Object", { args })
    const obj = args as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, formatArgs(v)])
    )
  }

  return "UNKNOWN"
}
