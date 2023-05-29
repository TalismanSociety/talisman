import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { EthSignBodyMessage } from "@ui/domains/Ethereum/Sign/EthSignBodyMessage"
import { useEthSignMessageRequest } from "@ui/domains/Sign/SignRequestContext"
import { Suspense, lazy, useEffect, useMemo } from "react"

import { SignContainer } from "./common"
import { SignAccountAvatar } from "./SignAccountAvatar"

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

export const EthSignMessageRequest = () => {
  const { url, request, approve, approveHardware, reject, status, message, account, network } =
    useEthSignMessageRequest()

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
                <Grid>
                  <SimpleButton disabled={processing} onClick={reject}>
                    Cancel
                  </SimpleButton>
                  <SimpleButton
                    disabled={processing}
                    processing={processing}
                    primary
                    onClick={approve}
                  >
                    Approve
                  </SimpleButton>
                </Grid>
              )}
            </>
          )}
        </Suspense>
      </Footer>
    </SignContainer>
  )
}
