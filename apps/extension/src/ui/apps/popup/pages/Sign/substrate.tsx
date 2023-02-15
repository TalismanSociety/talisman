import { AccountJsonHardwareSubstrate } from "@core/domains/accounts/types"
import { KnownSigningRequestIdOnly, SignerPayloadRaw } from "@core/domains/signing/types"
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
import { Suspense, lazy, useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"

import { Container } from "./common"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

export const SubstrateSignRequest = () => {
  const { id } = useParams() as KnownSigningRequestIdOnly<"substrate-sign">
  const signingRequest = useSigningRequestById(id)
  const { url, request, approve, reject, status, message, account, chain, approveHardware } =
    usePolkadotSigningRequest(signingRequest)
  const { analysing, txDetails, error: txDetailsError } = usePolkadotTransactionDetails(id)

  const payloadType = useMemo(() => {
    if (!request?.payload) return "unknown"
    if ((request.payload as SignerPayloadRaw).data) return "message"
    else return "transaction"
  }, [request?.payload])

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
            <div className="flex grow flex-col">
              <h1>{payloadType === "message" ? "Sign" : "Approve"} Request</h1>
              <h2 className="center">
                You are {payloadType === "message" ? "signing a message" : "approving a request"}{" "}
                with account <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` on ${chain.name}` : null}
              </h2>
              {payloadType === "message" ? (
                <textarea
                  readOnly
                  className="scrollable scrollable-700 bg-black-tertiary scroll my-12 w-full grow resize-none overflow-x-auto rounded-sm p-6 font-mono text-base"
                  value={(request.payload as SignerPayloadRaw).data}
                />
              ) : null}
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
              <div className="flex w-full gap-12">
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
              </div>
            )}
            {account.isHardware && reject && (
              <Suspense fallback={null}>
                <LedgerSubstrate
                  payload={request.payload}
                  account={account as AccountJsonHardwareSubstrate}
                  genesisHash={chain?.genesisHash ?? account?.genesisHash ?? undefined}
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
