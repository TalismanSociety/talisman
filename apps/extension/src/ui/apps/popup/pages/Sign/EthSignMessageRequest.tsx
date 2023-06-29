import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { AppPill } from "@talisman/components/AppPill"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { EthSignBodyMessage } from "@ui/domains/Sign/Ethereum/EthSignBodyMessage"
import { useEthSignMessageRequest } from "@ui/domains/Sign/SignRequestContext"
import { Suspense, lazy, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { SignContainer } from "./common"
import { SignAccountAvatar } from "./SignAccountAvatar"

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

export const EthSignMessageRequest = () => {
  const { t } = useTranslation("sign")
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
    <SignContainer>
      <Header text={<AppPill url={url} />} nav={<SignAccountAvatar account={account} />}></Header>
      <Content>
        {account && request && network && (
          <EthSignBodyMessage account={account} request={request} />
        )}
      </Content>
      <Footer>
        <Suspense fallback={null}>
          {errorMessage && <p className="error">{errorMessage}</p>}
          {account && request && (
            <>
              {account.isHardware ? (
                <LedgerEthereum
                  method={request.method}
                  payload={request.request}
                  account={account as AccountJsonHardwareEthereum}
                  onSignature={approveHardware}
                  onReject={reject}
                />
              ) : (
                <div className="grid w-full grid-cols-2 gap-12">
                  <Button disabled={processing} onClick={reject}>
                    {t("Cancel")}
                  </Button>
                  <Button
                    disabled={processing || !isValid}
                    processing={processing}
                    primary
                    onClick={approve}
                  >
                    {t("Approve")}
                  </Button>
                </div>
              )}
            </>
          )}
        </Suspense>
      </Footer>
    </SignContainer>
  )
}
