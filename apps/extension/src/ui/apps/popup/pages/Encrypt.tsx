import { DecryptRequestIdOnly, EncryptRequestIdOnly } from "@extension/core"
import { AccountJson } from "@extension/core"
import { AppPill } from "@talisman/components/AppPill"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { useEncryptRequest } from "@ui/domains/Encrypt/EncryptRequestContext"
import { Message } from "@ui/domains/Sign/Message"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useRequest } from "@ui/hooks/useRequest"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button } from "talisman-ui"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"
import { SignAccountAvatar } from "./Sign/SignAccountAvatar"

const SignMessage = ({
  account,
  request,
  isDecrypt,
}: {
  account: AccountJson
  request: string
  isDecrypt: boolean
}) => {
  const { t } = useTranslation("request")
  const data = useMemo(() => {
    return request
  }, [request])

  return (
    <div className="text-body-secondary flex h-full w-full flex-col items-center pt-8">
      <h1 className="text-body leading-base text-md my-0 font-sans font-bold">
        {isDecrypt ? "Decrypt " : "Encrypt "}Request
      </h1>
      <h2 className="mt-8 flex w-full flex-col items-center text-base leading-[3.2rem]">
        {isDecrypt
          ? t("You are decrypting some data with")
          : t("You are encrypting some data with")}
        <br />
        <AccountPill account={account} />
      </h2>
      <Message className="mt-8 w-full flex-grow" text={data} />
    </div>
  )
}

export const Encrypt = () => {
  const { t } = useTranslation("request")
  const { popupOpenEvent } = useAnalytics()
  const { id } = useParams() as EncryptRequestIdOnly | DecryptRequestIdOnly
  const req = useRequest(id)
  const { url, request, approve, reject, status, message, account, type } = useEncryptRequest(req)

  useEffect(() => {
    popupOpenEvent("encrypt")
  }, [popupOpenEvent])

  const { processing, errorMessage } = useMemo(() => {
    return {
      processing: status === "PROCESSING",
      errorMessage: status === "ERROR" ? message : "",
    }
  }, [status, message])

  return (
    <PopupLayout>
      <PopupHeader right={<SignAccountAvatar account={account} />}>
        <AppPill url={url} />
      </PopupHeader>
      <PopupContent>
        {account && request && (
          <SignMessage
            account={account}
            request={request?.payload.message as string}
            isDecrypt={type == "decrypt"}
          />
        )}
      </PopupContent>
      <PopupFooter>
        {errorMessage && (
          <SignAlertMessage className="mb-8" type="error">
            {errorMessage}
          </SignAlertMessage>
        )}
        {account && request && (
          <>
            <div className="grid w-full grid-cols-2 gap-12">
              <Button disabled={processing} onClick={reject}>
                {t("Cancel")}
              </Button>
              <Button disabled={processing} processing={processing} primary onClick={approve}>
                {t("Approve")}
              </Button>
            </div>
          </>
        )}
      </PopupFooter>
    </PopupLayout>
  )
}
