import type { SignerPayloadRaw } from "@core/domains/signing/types"
import { normalizeAddress } from "@talismn/crypto"
import type { SiwsMessage } from "@talismn/siws"
import { isAsciiPrintable, u8aToString, u8aUnwrapBytes } from "@talismn/util"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { AppPill } from "@ui/components/AppPill"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { SignInDomainMismatchAlert } from "@ui/domains/Sign/SignInDomainMismatchAlert"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { useErrorShown } from "@ui/hooks/analytics/errorShown"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignNetworkLogo } from "../SignNetworkLogo"
import { FooterContent } from "./FooterContent"
import { MessageSiws } from "./MessageSiws"

export const PolkadotSignMessageRequest = () => {
  const { t } = useTranslation()
  const {
    url,
    request,
    status,
    message: statusMessage,
    errorCategory,
    account,
    chain,
    siws,
    signInDomainMismatch,
  } = usePolkadotSigningRequest()

  const errorMessage = useMemo(
    () => (status === "ERROR" ? statusMessage : ""),
    [status, statusMessage]
  )
  useErrorShown({ shown: errorMessage, surface: "alert", category: errorCategory })

  const { data: bytes, address: bytesAddress } = request.payload as SignerPayloadRaw
  const messageText = useMemo(
    () => (isAsciiPrintable(bytes) ? u8aToString(u8aUnwrapBytes(bytes)) : bytes),
    [bytes]
  )

  useEffect(() => {
    // force close upon success, usefull in case this is the browser embedded popup (which doesn't close by itself)
    if (status === "SUCCESS") window.close()
  }, [status])

  const isSiwsAddressMismatch = useIsSiwsAddressMismatch(siws, account.address, bytesAddress)

  return (
    <PopupLayout>
      <PopupHeader right={<SignNetworkLogo network={chain} />}>
        <AppPill url={url} />
      </PopupHeader>
      <PopupContent>
        {siws !== null && (
          <MessageSiws
            account={account}
            chain={chain}
            request={siws}
            isAddressMismatch={isSiwsAddressMismatch}
          />
        )}
        {siws === null && account && request && (
          <>
            <div className="flex h-full w-full flex-col items-center text-center text-body-secondary">
              <h1 className="my-12 font-bold text-body text-md leading-9">{t("Sign Request")}</h1>
              <h2 className="mb-8 text-base leading-16">
                {t("You are signing a message with account")}{" "}
                <AccountPill account={account} ss58Format={chain?.prefix ?? undefined} />
                {chain ? ` ${t("on {{chainName}}", { chainName: chain.name })}` : null}
              </h2>
              <Message className="w-full grow" text={messageText} />
            </div>
            <SignInDomainMismatchAlert mismatch={signInDomainMismatch} className="mt-8" />
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

const tryNormalizeAddress = (address: string) => {
  try {
    return normalizeAddress(address)
  } catch {
    return null
  }
}

const useIsSiwsAddressMismatch = (
  siws: SiwsMessage | null,
  accountAddress: string,
  payloadAddress: string
) =>
  useMemo(() => {
    if (!siws) return false
    const signer = tryNormalizeAddress(accountAddress)
    return (
      !signer ||
      [payloadAddress, siws.address].some((address) => tryNormalizeAddress(address) !== signer)
    )
  }, [siws, accountAddress, payloadAddress])
