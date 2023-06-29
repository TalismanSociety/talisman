import { AccountJsonAny } from "@core/domains/accounts/types"
import { EthSignRequest } from "@core/domains/signing/types"
import { log } from "@core/log"
import { isHexString, stripHexPrefix } from "@ethereumjs/util"
import * as Sentry from "@sentry/browser"
import { classNames } from "@talismn/util"
import { Message } from "@ui/domains/Sign/Message"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { dump as convertToYaml } from "js-yaml"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"

const useEthSignMessage = (request: EthSignRequest) => {
  const { isTypedData, typedMessage, verifyingAddress, chainId, ethChainId } = useMemo(() => {
    try {
      const isTypedData = Boolean(request?.method?.startsWith("eth_signTypedData"))
      const typedMessage = isTypedData ? JSON.parse(request.request) : undefined
      const verifyingAddress = typedMessage?.domain?.verifyingContract as string | undefined
      const chainId = typedMessage?.domain?.chainId
        ? parseInt(typedMessage.domain?.chainId)
        : undefined
      const ethChainId = request.ethChainId
      return { isTypedData, typedMessage, verifyingAddress, chainId, ethChainId }
    } catch (err) {
      log.error(err)
      return { isTypedData: false }
    }
  }, [request])

  const text = useMemo(() => {
    if (typedMessage) {
      try {
        if (typedMessage.message) return convertToYaml(typedMessage.message)

        return convertToYaml(typedMessage)
      } catch (err) {
        Sentry.captureException(err)
      }
    }
    try {
      if (isHexString(request.request)) {
        const stripped = stripHexPrefix(request.request)
        const buff = Buffer.from(stripped, "hex")
        // if 32 bytes display as is, can be tested when approving NFT listings on tofunft.com
        return buff.length === 32 ? request.request : buff.toString("utf8")
      }
    } catch (err) {
      log.error(err)
    }
    return request.request
  }, [request.request, typedMessage])

  return { isTypedData, text, verifyingAddress, chainId, ethChainId }
}

export type EthSignBodyMessageProps = {
  account: AccountJsonAny
  request: EthSignRequest
}

export const EthSignBodyMessage: FC<EthSignBodyMessageProps> = ({ account, request }) => {
  const { t } = useTranslation("request")
  const { isTypedData, text, verifyingAddress, ethChainId } = useEthSignMessage(request)
  const evmNetwork = useEvmNetwork(ethChainId)

  return (
    <div className="flex h-full w-full flex-col items-center">
      <h1 className="!leading-base !my-0 font-sans !text-lg !font-bold">{t("Sign Request")}</h1>
      <div className="leading-base my-12 flex w-full flex-col items-center">
        <div className="p-2">
          {isTypedData ? t("You are signing typed data") : t("You are signing a message")}{" "}
        </div>
        <div className="flex items-start p-1">
          <div>{t("with")}</div>
          <SignParamAccountButton address={account.address} withIcon />
        </div>
        {!!verifyingAddress && !!evmNetwork && (
          <div className="flex items-start p-1">
            <div>{t("for contract")}</div>{" "}
            <SignParamNetworkAddressButton address={verifyingAddress} network={evmNetwork} />
          </div>
        )}
      </div>
      <Message
        className={classNames("w-full grow", isTypedData && "whitespace-pre text-xs")}
        text={text}
      />
    </div>
  )
}
