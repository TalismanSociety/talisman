import { isHexString, stripHexPrefix } from "@ethereumjs/util"
import { hexToString } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import { ParsedMessage } from "@spruceid/siwe-parser"
import { classNames } from "@talismn/util"
import { Account, EthSignRequest } from "extension-core"
import { log } from "extension-shared"
import { dump as convertToYaml } from "js-yaml"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

import { Message } from "@ui/domains/Sign/Message"
import { useNetworkById } from "@ui/state"

import { RiskAnalysisPillButton } from "../risk-analysis/RiskAnalysisPillButton"
import { SignAlertMessage } from "../SignAlertMessage"
import { ViewDetailsButton } from "../ViewDetails/ViewDetailsButton"
import { EthSignBodyMessageSIWE } from "./EthSignBodyMessageSIWE"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"

const useEthSignMessage = (request: EthSignRequest) => {
  const {
    isTypedData,
    typedMessage,
    verifyingAddress,
    chainId,
    ethChainId,
    isInvalidVerifyingContract,
  } = useMemo(() => {
    try {
      const isTypedData = Boolean(request?.method?.startsWith("eth_signTypedData"))
      const typedMessage = isTypedData ? JSON.parse(request.request) : undefined
      const verifyingAddress = typedMessage?.domain?.verifyingContract as string | undefined
      const chainId = typedMessage?.domain?.chainId
        ? parseInt(typedMessage.domain?.chainId)
        : undefined
      const ethChainId = request.ethChainId
      const isInvalidVerifyingContract =
        verifyingAddress && verifyingAddress.toLowerCase().startsWith("javascript:")
      return {
        isTypedData,
        typedMessage,
        verifyingAddress,
        chainId,
        ethChainId,
        isInvalidVerifyingContract,
      }
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

  const siwe = useMemo(() => {
    try {
      const text = hexToString(request.request)
      return new ParsedMessage(text)
    } catch (err) {
      return null
    }
  }, [request.request])

  return {
    siwe,
    isTypedData,
    text,
    verifyingAddress,
    chainId,
    ethChainId,
    isInvalidVerifyingContract,
  }
}

export type EthSignBodyMessageProps = {
  account: Account
  request: EthSignRequest
}

export const EthSignBodyMessage: FC<EthSignBodyMessageProps> = ({ account, request }) => {
  const { t } = useTranslation()
  const { siwe, isTypedData, text, verifyingAddress, ethChainId, isInvalidVerifyingContract } =
    useEthSignMessage(request)
  const ocViewDetails = useOpenClose()

  const evmNetwork = useNetworkById(ethChainId, "ethereum")

  if (siwe) return <EthSignBodyMessageSIWE account={account} request={request} siwe={siwe} />

  return (
    <div className="text-body-secondary flex h-full w-full flex-col items-center pt-4">
      <h1 className="text-body leading-base my-0 font-sans text-lg font-bold">
        {t("Sign Request")}
      </h1>
      <div className="leading-base my-8 flex w-full flex-col items-center">
        <div className="p-2">
          {isTypedData ? t("You are signing typed data") : t("You are signing a message")}{" "}
        </div>
        <div className="flex max-w-full items-start p-1">
          <div>{t("with")}</div>
          <SignParamAccountButton address={account.address} withIcon />
        </div>
        {!!verifyingAddress && !!evmNetwork && (
          <div className="flex max-w-full items-start p-1">
            <div className="whitespace-nowrap">{t("for contract")}</div>{" "}
            <SignParamNetworkAddressButton address={verifyingAddress} network={evmNetwork} />
          </div>
        )}
      </div>
      <div className="mb-8 flex w-full flex-col items-center gap-4">
        <RiskAnalysisPillButton />
        <ViewDetailsButton onClick={ocViewDetails.open} />
      </div>
      <Message
        className={classNames("w-full grow", isTypedData && "whitespace-pre text-xs")}
        text={text}
      />

      {isInvalidVerifyingContract && (
        <SignAlertMessage type="error" className="mt-8">
          {t("Verifying contract's address is invalid.")}
        </SignAlertMessage>
      )}
      <Drawer
        anchor="bottom"
        containerId="main"
        isOpen={ocViewDetails.isOpen}
        onDismiss={ocViewDetails.close}
      >
        <ViewDetailsContent message={request.request} onClose={ocViewDetails.close} />
      </Drawer>
    </div>
  )
}

const ViewDetailsContent: FC<{
  message: string
  onClose: () => void
}> = ({ message, onClose }) => {
  const { t } = useTranslation()

  const formatted = useMemo(() => {
    try {
      const parsed = JSON.parse(message)
      return JSON.stringify(parsed, null, 2)
    } catch (err) {
      log.error("Failed to parse typed message", err)
      return message
    }
  }, [message])

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 p-12">
      <div className="flex w-full grow flex-col overflow-hidden text-sm leading-[2rem]">
        <div className="text-body-secondary">{t("Message")}</div>
        <pre className="text-body-secondary scrollable scrollable-700 bg-grey-800 rounded-xs w-full grow overflow-auto p-4">
          {formatted}
        </pre>
      </div>
      <Button className="shrink-0" onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}
