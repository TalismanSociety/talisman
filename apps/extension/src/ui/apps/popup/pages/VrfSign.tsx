import { DEBUG } from "@common/constants"
import type { SigningRequestID } from "@core/domains/signing/types"
import { hexToU8a, isAsciiPrintable, u8aToString } from "@talismn/util"
import { api } from "@ui/api"
import { AppPill } from "@ui/components/AppPill"
import { Button } from "@ui/components/Button"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useStatus from "@ui/hooks/useStatus"
import { useRequest } from "@ui/state/requests"
import { type FC, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"
import { SignAccountAvatar } from "./Sign/SignAccountAvatar"

/** `data` is bounded at 64kB, still 128k characters of hex — same budget as `Message` */
const MAX_HEX_CHARS = 1000

/** an omitted field and an explicit `0x` both mean empty bytes */
const TranscriptField: FC<{ label: string; value?: string }> = ({ label, value }) => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="text-grey-500">{label}</div>
      <div className="break-all font-mono text-body-secondary">
        {value && value !== "0x" ? value : t("empty")}
      </div>
    </div>
  )
}

export const VrfSignRequest = () => {
  const { t } = useTranslation()
  const { popupOpenEvent } = useAnalytics()
  const { id } = useParams<"id">()
  const req = useRequest(id as SigningRequestID<"vrf-sign">)
  const { status, message, setStatus } = useStatus()

  useEffect(() => {
    if (!req) window.close()
  }, [req])

  useEffect(() => {
    popupOpenEvent("vrf-sign")
  }, [popupOpenEvent])

  const approve = useCallback(async () => {
    if (!req) return
    setStatus.processing("Approving request")
    try {
      await api.approveSignVrf(req.id)
      setStatus.success("Approved")
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: dev only
      DEBUG && console.error(err)
      setStatus.error("Failed to approve VRF sign request")
    }
  }, [req, setStatus])

  const reject = useCallback(async () => {
    try {
      if (req) await api.cancelSignRequest(req.id)
    } catch {
      // ignore, request doesn't exist
      // we just want popup to close
    }
    window.close()
  }, [req])

  const processing = status === "PROCESSING"
  const errorMessage = status === "ERROR" ? message : ""

  const data = req?.request.payload.data
  // the VRF signs `data` verbatim, there is no <Bytes> wrapper to strip
  const dataText = useMemo(
    () => (data && isAsciiPrintable(data) ? u8aToString(hexToU8a(data)) : undefined),
    [data]
  )
  const dataHex = useMemo(
    () => (data && data.length > MAX_HEX_CHARS ? `${data.slice(0, MAX_HEX_CHARS)}…` : data),
    [data]
  )

  return (
    <PopupLayout>
      <PopupHeader right={<SignAccountAvatar account={req?.account} />}>
        <AppPill url={req?.url} />
      </PopupHeader>
      <PopupContent>
        {req && (
          <div className="flex h-full w-full flex-col items-center pt-8 text-body-secondary">
            <h1 className="my-0 font-bold font-sans text-body text-md leading-base">
              {t("VRF Signature Request")}
            </h1>
            <h2 className="mt-8 flex w-full flex-col items-center text-base leading-16">
              {t("You are computing a verifiable random function over this data with")}
              <br />
              <AccountPill account={req.account} />
            </h2>
            <Message className="mt-8 w-full grow" text={dataText ?? req.request.payload.data} />
            {dataText !== undefined && (
              <div className="mt-4 w-full break-all text-left font-mono text-grey-500 text-xs">
                {dataHex}
              </div>
            )}
            <div className="mt-8 flex w-full flex-col gap-4 text-xs" data-testid="vrf-transcript">
              <TranscriptField label={t("Context")} value={req.request.payload.context} />
            </div>
          </div>
        )}
      </PopupContent>
      <PopupFooter>
        {req && (
          <SignAlertMessage className="mb-8">
            {t(
              "The result is a value derived from this account. The site receives it and can reproduce it at any time by requesting the same data and context, so it works as a persistent identifier."
            )}
          </SignAlertMessage>
        )}
        {errorMessage && (
          <SignAlertMessage className="mb-8" type="error">
            {errorMessage}
          </SignAlertMessage>
        )}
        {req && (
          <div className="grid w-full grid-cols-2 gap-12">
            <Button disabled={processing} onClick={reject}>
              {t("Cancel")}
            </Button>
            <Button disabled={processing} processing={processing} primary onClick={approve}>
              {t("Approve")}
            </Button>
          </div>
        )}
      </PopupFooter>
    </PopupLayout>
  )
}
