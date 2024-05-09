import { AccountJsonDcent } from "@extension/core"
import { AppPill } from "@talisman/components/AppPill"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { EthSignBodyMessage } from "@ui/domains/Sign/Ethereum/EthSignBodyMessage"
import { RiskAnalysisProvider } from "@ui/domains/Sign/Ethereum/riskAnalysis"
import { SignApproveButton } from "@ui/domains/Sign/SignApproveButton"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useEthSignMessageRequest } from "@ui/domains/Sign/SignRequestContext"
import { Suspense, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

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
            {errorMessage && <p className="error">{errorMessage}</p>}
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
                      disabled={!isValid}
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
