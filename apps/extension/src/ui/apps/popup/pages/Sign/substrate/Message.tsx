import { SignerPayloadRaw } from "@extension/core"
import { isAscii, u8aToString, u8aUnwrapBytes } from "@polkadot/util"
import { AppPill } from "@talisman/components/AppPill"
import { SiwsMessage, parseMessage as siwsParseMessage } from "@talismn/siws"
import { encodeAnyAddress } from "@talismn/util"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignNetworkLogo } from "../SignNetworkLogo"
import { FooterContent } from "./FooterContent"
import { MessageSiws } from "./MessageSiws"

export const PolkadotSignMessageRequest = () => {
  const { t } = useTranslation("request")
  const {
    url,
    request,
    status,
    message: statusMessage,
    account,
    chain,
  } = usePolkadotSigningRequest()

  const errorMessage = useMemo(
    () => (status === "ERROR" ? statusMessage : ""),
    [status, statusMessage]
  )

  const bytes = (request?.payload as SignerPayloadRaw).data
  const messageText = useMemo(
    () => (isAscii(bytes) ? u8aToString(u8aUnwrapBytes(bytes)) : bytes),
    [bytes]
  )

  useEffect(() => {
    // force close upon success, usefull in case this is the browser embedded popup (which doesn't close by itself)
    if (status === "SUCCESS") window.close()
  }, [status])

  const [siwsRequest, siwsValidationError] = useSiwsRequest({ url, request, account })

  return (
    <PopupLayout>
      <PopupHeader right={<SignNetworkLogo network={chain} />}>
        <AppPill url={url} />
      </PopupHeader>
      <PopupContent>
        {siwsRequest !== null && (
          <MessageSiws
            account={account}
            chain={chain}
            request={siwsRequest}
            validationError={siwsValidationError}
          />
        )}
        {siwsRequest === null && account && request && (
          <>
            <div className="text-body-secondary flex h-full w-full flex-col items-center text-center">
              <h1 className="text-body text-md my-12 font-bold leading-9">{"Sign Request"}</h1>
              <h2 className="mb-8 text-base leading-[3.2rem]">
                {t("You are signing a message with account")}{" "}
                <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` ${t("on {{chainName}}", { chainName: chain.name })}` : null}
              </h2>
              <Message className="w-full flex-grow" text={messageText} />
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

/**
 * Given the `url`, `request`, and `account` fields of the `usePolkadotSigningRequest` for a raw message,
 * this hook will either return a [SiwsMessage] or [null], depending on whether the raw message conforms to the
 * SIWS (Sign In With Substrate) spec.
 *
 * Additionally, this hook will return [SiwsMessage, string] in the event that the raw message confirms to the
 * SIWS spec, but the domain or address in the message are incorrect.
 */
const useSiwsRequest = ({
  url,
  request,
  account,
}: Pick<ReturnType<typeof usePolkadotSigningRequest>, "url" | "request" | "account">) =>
  useMemo((): [SiwsMessage | null, string | null] => {
    const siwsMessage = (() => {
      try {
        return siwsParseMessage((request.payload as SignerPayloadRaw)?.data)
      } catch (error) {
        return null
      }
    })()

    // Not a valid SIWS message, fall back to regular raw message signing
    if (siwsMessage === null) return [null, null]

    const encodeAddressOrNull = (...args: Parameters<typeof encodeAnyAddress>) => {
      try {
        return encodeAnyAddress(...args)
      } catch {
        return null
      }
    }

    const truth = {
      address: encodeAddressOrNull(account.address),
      domain: new URL(url).host,
    }
    const check = {
      addresses: [
        encodeAddressOrNull((request.payload as SignerPayloadRaw).address),
        encodeAddressOrNull(siwsMessage.address),
      ],
      domain: siwsMessage.domain,
    }

    const isValidAddresses =
      truth.address && check.addresses.every((address) => truth.address === address)
    const isValidDomain = check.domain === truth.domain
    const isValid = isValidAddresses && isValidDomain

    // A valid SIWS message, but the domain or address is invalid.
    // We should show an error to the user.
    if (!isValid) return [siwsMessage, "Invalid Address/Domain"]

    // A valid SIWS message, and the domain and address check out.
    return [siwsMessage, null]
  }, [account.address, request.payload, url])
