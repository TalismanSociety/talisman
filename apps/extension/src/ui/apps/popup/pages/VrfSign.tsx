import { DEBUG } from "@common/constants"
import type { SigningRequestID } from "@core/domains/signing/types"
import { api } from "@ui/api"
import { AppPill } from "@ui/components/AppPill"
import { Button } from "@ui/components/Button"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useStatus from "@ui/hooks/useStatus"
import { useRequest } from "@ui/state/requests"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"
import { SignAccountAvatar } from "./Sign/SignAccountAvatar"

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
            <Message className="mt-8 w-full grow" text={req.request.payload.data} />
          </div>
        )}
      </PopupContent>
      <PopupFooter>
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
