import { AccountJsonHardware } from "@core/domains/accounts/types"
import { SigningRequest } from "@core/domains/signing/types"
import { Box } from "@talisman/components/Box"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { PendingRequests } from "@ui/domains/Sign/PendingRequests"
import {
  usePolkadotSigningRequest,
  usePolkadotTransactionDetails,
} from "@ui/domains/Sign/SignRequestContext"
import { SiteInfo } from "@ui/domains/Sign/SiteInfo"
import { ViewDetails } from "@ui/domains/Sign/ViewDetails/ViewDetails"
import { useSigningRequestById } from "@ui/hooks/useSigningRequestById"
import { Suspense, lazy, useCallback, useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"

import { Container } from "./common"

const Ledger = lazy(() => import("@ui/domains/Sign/Ledger"))

export const SubstrateSignRequest = () => {
  const { id } = useParams() as { id: string }
  const signingRequest = useSigningRequestById(id) as SigningRequest | undefined
  const { url, request, approve, reject, status, message, account, chain, approveHardware } =
    usePolkadotSigningRequest(signingRequest)
  const { analysing, txDetails, error: txDetailsError } = usePolkadotTransactionDetails(id)

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
    <Container>
      <Header text={<PendingRequests />}></Header>
      <Content>
        {account && request && (
          <>
            <SiteInfo siteUrl={url} />
            <div className="grow">
              <h1>Approve Request</h1>
              <h2 className="center">
                You are approving a request with account{" "}
                <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` on ${chain.name}` : null}
              </h2>
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
            <div className="bottom">
              {signingRequest && (
                <ViewDetails {...{ signingRequest, analysing, txDetails, txDetailsError }} />
              )}
            </div>
          </>
        )}
      </Content>
      <Footer>
        {account && request && (
          <>
            {!account.isHardware && (
              <Box flex fullwidth gap={2.4}>
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
              </Box>
            )}
            {account.isHardware && (
              <Suspense fallback={null}>
                <Ledger
                  payload={(request as SigningRequest["request"]).payload}
                  account={account as AccountJsonHardware}
                  genesisHash={chain?.genesisHash ?? undefined}
                  onSignature={approveHardware}
                  onReject={reject}
                />
              </Suspense>
            )}
          </>
        )}
      </Footer>
    </Container>
  )
}
