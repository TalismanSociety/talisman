import { EthSignRequest } from "@extension/core"
import { AccountJsonAny } from "@extension/core"
import { log } from "@extension/shared"
import { hexToString } from "@polkadot/util"
import { ParsedMessage } from "@spruceid/siwe-parser"
import { UserRightIcon } from "@talismn/icons"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

import { SignAlertMessage } from "../SignAlertMessage"
import { ViewDetailsAddress } from "../ViewDetails/ViewDetailsAddress"
import { ViewDetailsButton } from "../ViewDetails/ViewDetailsButton"
import { ViewDetailsField } from "../ViewDetails/ViewDetailsField"
import { RiskAnalysisPillButton } from "./riskAnalysis"
import { SignParamAccountButton } from "./shared"

const ViewDetailsContent: FC<{
  account: AccountJsonAny
  request: EthSignRequest
  siwe: ParsedMessage
  onClose: () => void
}> = ({ account, request, siwe, onClose }) => {
  const { t } = useTranslation("request")
  const evmNetwork = useEvmNetwork(String(siwe.chainId))

  const message = useMemo(() => hexToString(request.request), [request.request])

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 p-12">
      <div className="scrollable scrollable-700 flex-grow overflow-y-auto overflow-x-hidden pr-4 text-sm leading-[2rem]">
        <div className="text-body-secondary">{t("Details")}</div>
        <p>
          {t(
            "You are about to sign in via Ethereum. Please ensure you trust the application before continuing."
          )}
        </p>
        <ViewDetailsAddress
          label={t("From")}
          address={account.address}
          blockExplorerUrl={evmNetwork?.explorerUrl}
        />
        <ViewDetailsField label={t("Domain")}>{siwe.domain}</ViewDetailsField>
        <ViewDetailsField label={t("Statement")}>{siwe.statement}</ViewDetailsField>
        <ViewDetailsField label={t("Network")}>
          {evmNetwork?.name} ({siwe.chainId})
        </ViewDetailsField>
        <ViewDetailsField label={t("Nonce")}>{siwe.nonce}</ViewDetailsField>
        <ViewDetailsField label={t("Issued At")}>{siwe.issuedAt}</ViewDetailsField>
        <ViewDetailsField label={t("Expires At")}>{siwe.expirationTime}</ViewDetailsField>
        <ViewDetailsField label={t("Message")}>
          <div className="mt-2 pr-2">
            <pre className="text-body-secondary scrollable scrollable-700 bg-grey-800 rounded-xs w-full overflow-x-auto p-4">
              {message}
            </pre>
          </div>
        </ViewDetailsField>
      </div>
      <Button className="shrink-0" onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}

export const EthSignBodyMessageSIWE: FC<{
  account: AccountJsonAny
  request: EthSignRequest
  siwe: ParsedMessage
}> = ({ account, request, siwe }) => {
  const { t } = useTranslation("request")
  const { isOpen, open, close } = useOpenClose()

  const isValidUrl = useMemo(() => {
    try {
      // current webapp's domain must be the same as the siwe's domain
      const currUrl = new URL(request.url)
      return siwe.domain === currUrl.hostname
    } catch (err) {
      log.error(err)
      return false
    }
  }, [siwe, request])

  return (
    <div className="scrollable scrollable-800 flex h-full max-h-full w-full flex-col items-center overflow-auto">
      <div className="flex w-full flex-col items-center pt-4">
        <div className="bg-grey-800 rounded-full p-5">
          <UserRightIcon className="text-primary text-[2.8rem]" />
        </div>
        <div className="mt-8 text-lg font-bold">{t("Sign In")}</div>
        <div className="text-body-secondary mt-16 flex w-full flex-col items-center gap-3 overflow-hidden">
          <div className="text-body max-w-full truncate font-bold">{siwe.domain}</div>
          <div className="text-body-secondary">{t("wants you to sign in with Ethereum")}</div>
          <div className="[&>button>div>span]:text-body flex max-w-full items-center justify-center truncate [&>button>div>span]:font-bold">
            <span>{t("with")}</span>
            <SignParamAccountButton address={account.address} withIcon />
          </div>
          <ViewDetailsButton onClick={open} className="my-4" />
          <RiskAnalysisPillButton />
        </div>
        {!!siwe.statement && (
          <div className="bg-grey-850 mt-8 w-full rounded-sm p-4 text-sm">
            <div className="text-body-disabled text-xs">{t("Statement")}</div>
            <div className="text-body leading-paragraph mt-2">{siwe.statement}</div>
          </div>
        )}
      </div>
      <div className="grow"></div>
      {!isValidUrl && (
        <SignAlertMessage type="error" className="mt-8">
          {t("Sign in domain is different from website domain.")}
        </SignAlertMessage>
      )}
      <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={close}>
        <ViewDetailsContent account={account} request={request} siwe={siwe} onClose={close} />
      </Drawer>
    </div>
  )
}
