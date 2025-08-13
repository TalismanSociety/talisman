import { base58 } from "@talismn/crypto"
import { isAccountOfType, SolSigningRequest } from "extension-core"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AppPill } from "@talisman/components/AppPill"
import { api } from "@ui/api"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { MsgSignButton } from "@ui/domains/Sign/MsgSignButton/MsgSignButton"
import { MsgSignButtonPayloadSol } from "@ui/domains/Sign/MsgSignButton/types"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"

export const SolSignMessageRequest: FC<{
  request: SolSigningRequest
}> = ({ request }) => {
  if (request.request.type !== "message")
    throw new Error("Invalid request type for SolSignMessageRequest")

  const { t } = useTranslation()

  const {
    id,
    account,
    request: { message },
    url,
  } = request

  const [state, setState] = useState<{
    processing: boolean
    error: string | undefined
  }>({
    processing: false,
    error: undefined,
  })

  const decodedMessage = useMemo(() => {
    try {
      return new TextDecoder().decode(base58.decode(message))
    } catch {
      return message
    }
  }, [message])

  const signPayload = useMemo<MsgSignButtonPayloadSol>(
    () => ({
      platform: "solana",
      address: account.address,
      message: Buffer.from(base58.decode(message)),
    }),
    [account, message],
  )

  const handleReject = async () => {
    window.close() // will reject the request automatically
  }

  const handleApprove = async (signature?: string) => {
    setState({ error: undefined, processing: true })
    try {
      await api.solSignApprove({ id, type: "message", signature }) // will close the window automatically if successful
    } catch (error) {
      setState({
        processing: false,

        error: (error as Error).message || "Failed to approve sign request",
      })
    }
  }

  return (
    <PopupLayout>
      <PopupHeader>
        <AppPill url={url} />
      </PopupHeader>
      <PopupContent>
        <div className="text-body-secondary flex h-full w-full flex-col items-center text-center">
          <h1 className="text-body text-md my-12 font-bold leading-9">{t("Sign Request")}</h1>
          <h2 className="mb-8 text-base leading-[3.2rem]">
            {t("You are signing a message with account")} <AccountPill account={account} />
          </h2>
          <Message className="w-full flex-grow" text={decodedMessage} />
        </div>
      </PopupContent>
      <PopupFooter>
        {isAccountOfType(account, "watch-only") && (
          <SignAlertMessage className="mb-6" type="error">
            {t("Cannot sign with a watch-only account.")}
          </SignAlertMessage>
        )}
        {!!state.error && (
          <SignAlertMessage className="mb-6" type="error">
            {state.error}
          </SignAlertMessage>
        )}
        <div className="grid w-full grid-cols-2 gap-12">
          <Button disabled={state.processing} onClick={handleReject}>
            {t("Cancel")}
          </Button>
          <MsgSignButton
            onSubmit={handleApprove}
            payload={signPayload}
            containerId="main"
            label={"Sign"}
          />
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}
