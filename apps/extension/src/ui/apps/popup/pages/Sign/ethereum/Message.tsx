import { Suspense, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AccountJsonDcent, AccountType } from "@extension/core"
import { AppPill } from "@talisman/components/AppPill"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { EthSignBodyMessage } from "@ui/domains/Sign/Ethereum/EthSignBodyMessage"
import { RiskAnalysisProvider } from "@ui/domains/Sign/Ethereum/riskAnalysis"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { SignApproveButton } from "@ui/domains/Sign/SignApproveButton"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useEthSignMessageRequest } from "@ui/domains/Sign/SignRequestContext"

import { SignNetworkLogo } from "../SignNetworkLogo"

export const EthSignMessageRequest = () => {
  const { t } = useTranslation("request")
  const {
    url,
    request,
    approve,
    approveHardware,
    reject,
    status,
    message,
    account,
    network,
    isValid,
    riskAnalysis,
  } = useEthSignMessageRequest()

  const { processing, errorMessage } = useMemo(() => {
    return {
      processing: status === "PROCESSING",
      errorMessage: status === "ERROR" ? message : "",
    }
  }, [status, message])

  useEffect(() => {
    // force close upon success, usefull in case this is the browser embedded popup (which doesn't close by itself)
    if (status === "SUCCESS") window.close()
  }, [status])

  return (
    <RiskAnalysisProvider riskAnalysis={riskAnalysis} onReject={reject}>
      <PopupLayout>
        <PopupHeader right={<SignNetworkLogo network={network} />}>
          <AppPill url={url} />
        </PopupHeader>
        <PopupContent>
          {account && request && network && (
            <EthSignBodyMessage account={account} request={request} />
          )}
        </PopupContent>
        <PopupFooter>
          <Suspense fallback={null}>
            {account.origin === AccountType.Watched && (
              <SignAlertMessage className="mb-6" type="error">
                {t("Cannot sign with a watch-only account.")}
              </SignAlertMessage>
            )}
            {errorMessage && (
              <SignAlertMessage className="mb-6" type="error">
                {errorMessage}
              </SignAlertMessage>
            )}
            {account && request && (
              <>
                {account.isHardware ? (
                  <SignHardwareEthereum
                    method={request.method}
                    payload={request.request}
                    account={account as AccountJsonDcent}
                    onSigned={approveHardware}
                    onCancel={reject}
                    containerId="main"
                  />
                ) : (
                  <div className="grid w-full grid-cols-2 gap-12">
                    <Button disabled={processing} onClick={reject}>
                      {t("Cancel")}
                    </Button>
                    <SignApproveButton
                      disabled={!isValid || account.origin === AccountType.Watched}
                      processing={processing}
                      primary
                      onClick={approve}
                    >
                      {t("Approve")}
                    </SignApproveButton>
                  </div>
                )}
              </>
            )}
          </Suspense>
        </PopupFooter>
      </PopupLayout>
    </RiskAnalysisProvider>
  )
}
