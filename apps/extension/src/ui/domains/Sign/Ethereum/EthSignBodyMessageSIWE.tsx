import type { Account } from "@core/domains/keyring/exports"
import type { EthSignRequest } from "@core/domains/signing/types"
import { hexToString } from "@polkadot/util"
import type { ParsedMessage } from "@spruceid/siwe-parser"
import { UserRightIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { Checkbox } from "@ui/components/Checkbox"
import { Drawer } from "@ui/components/Drawer"
import { useEthSignMessageRequest } from "@ui/domains/Sign/SignRequestContext"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useNetworkById } from "@ui/state/chaindata"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiskAnalysisPillButton } from "../risk-analysis/RiskAnalysisPillButton"
import { SignAlertMessage } from "../SignAlertMessage"
import { ViewDetailsAddress } from "../ViewDetails/ViewDetailsAddress"
import { ViewDetailsButton } from "../ViewDetails/ViewDetailsButton"
import { ViewDetailsField } from "../ViewDetails/ViewDetailsField"
import { SignParamAccountButton } from "./shared"

const ViewDetailsContent: FC<{
  account: Account
  request: EthSignRequest
  siwe: ParsedMessage
  onClose: () => void
}> = ({ account, request, siwe, onClose }) => {
  const { t } = useTranslation()
  const evmNetwork = useNetworkById(String(siwe.chainId), "ethereum")

  const message = useMemo(() => hexToString(request.request), [request.request])

  return (
    <div className="flex max-h-150 w-full flex-col gap-12 bg-grey-850 p-12">
      <div className="scrollable scrollable-700 grow overflow-y-auto overflow-x-hidden pr-4 text-sm leading-10">
        <div className="text-body-secondary">{t("Details")}</div>
        <p>
          {t(
            "You are about to sign in via Ethereum. Please ensure you trust the application before continuing."
          )}
        </p>
        <ViewDetailsAddress label={t("From")} address={account.address} network={evmNetwork} />
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
            <pre className="scrollable scrollable-700 w-full overflow-x-auto rounded-xs bg-grey-800 p-4 text-body-secondary">
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
  account: Account
  request: EthSignRequest
  siwe: ParsedMessage
}> = ({ account, request, siwe }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  const { siweDomainMismatch, isSiweMismatchAcknowledged, setIsSiweMismatchAcknowledged } =
    useEthSignMessageRequest()

  return (
    <div className="scrollable scrollable-800 flex h-full max-h-full w-full flex-col items-center overflow-auto">
      <div className="flex w-full flex-col items-center pt-4">
        <div className="rounded-full bg-grey-800 p-5">
          <UserRightIcon className="text-[1.75rem] text-primary" />
        </div>
        <div className="mt-8 font-bold text-lg">{t("Sign In")}</div>
        <div className="mt-16 flex w-full flex-col items-center gap-3 overflow-hidden text-body-secondary">
          <div className="max-w-full truncate font-bold text-body">{siwe.domain}</div>
          <div className="text-body-secondary">{t("wants you to sign in with Ethereum")}</div>
          <div className="flex max-w-full items-center justify-center truncate [&>button>div>span]:font-bold [&>button>div>span]:text-body">
            <span>{t("with")}</span>
            <SignParamAccountButton address={account.address} withIcon />
          </div>
          <ViewDetailsButton onClick={open} className="my-4" />
          <RiskAnalysisPillButton />
        </div>
        {!!siwe.statement && (
          <div className="mt-8 w-full rounded-sm bg-grey-850 p-4 text-sm">
            <div className="text-body-disabled text-xs">{t("Statement")}</div>
            <div className="mt-2 text-body leading-paragraph">{siwe.statement}</div>
          </div>
        )}
      </div>
      <div className="grow"></div>
      {siweDomainMismatch && (
        <SignAlertMessage type="error" className="mt-8">
          <div className="flex flex-col gap-4">
            <div>{t("Sign in domain is different from website domain.")}</div>
            <Checkbox
              checked={isSiweMismatchAcknowledged}
              onChange={(e) => setIsSiweMismatchAcknowledged(e.target.checked)}
            >
              {t("I understand the risk, sign in anyway")}
            </Checkbox>
          </div>
        </SignAlertMessage>
      )}
      <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={close}>
        <ViewDetailsContent account={account} request={request} siwe={siwe} onClose={close} />
      </Drawer>
    </div>
  )
}
