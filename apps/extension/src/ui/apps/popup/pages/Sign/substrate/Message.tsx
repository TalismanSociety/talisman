import { SignerPayloadRaw } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { FC, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignAccountAvatar } from "../SignAccountAvatar"
import { FooterContent } from "./FooterContent"

export const PolkadotSignMessageRequest: FC = () => {
  const { t } = useTranslation("request")
  const { url, request, status, message, account, chain } = usePolkadotSigningRequest()

  const errorMessage = useMemo(() => (status === "ERROR" ? message : ""), [status, message])

  useEffect(() => {
    // force close upon success, usefull in case this is the browser embedded popup (which doesn't close by itself)
    if (status === "SUCCESS") window.close()
  }, [status])

  return (
    <PopupLayout>
      <PopupHeader right={<SignAccountAvatar account={account} ss58Format={chain?.prefix} />}>
        <AppPill url={url} />
      </PopupHeader>
      <PopupContent>
        {account && request && (
          <>
            <div className="text-body-secondary flex h-full w-full flex-col items-center text-center">
              <h1 className="text-body text-md my-12 font-bold leading-9">{"Sign Request"}</h1>
              <h2 className="mb-8 text-base leading-[3.2rem]">
                {t("You are signing a message with account")}{" "}
                <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` ${t("on {{chainName}}", { chainName: chain.name })}` : null}
              </h2>
              <Message
                className="w-full flex-grow"
                text={(request.payload as SignerPayloadRaw).data}
              />
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
          </>
        )}
      </PopupContent>
      <PopupFooter>
        <FooterContent />
      </PopupFooter>
    </PopupLayout>
  )
}
