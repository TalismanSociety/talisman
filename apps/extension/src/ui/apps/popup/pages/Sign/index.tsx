import { lazy, Suspense, useMemo } from "react"
import Button from "@talisman/components/Button"
import Grid from "@talisman/components/Grid"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Header, Content, Footer } from "@ui/apps/popup/Layout"
import { ViewDetails } from "@ui/domains/Sign/ViewDetails/ViewDetails"
import { SiteInfo } from "@ui/domains/Sign/SiteInfo"
import { PendingRequests } from "@ui/domains/Sign/PendingRequests"
import { useSigningRequestById } from "@ui/hooks/useSigningRequestById"
import {
  usePolkadotSigningRequest,
  usePolkadotTransactionDetails,
} from "@ui/domains/Sign/SignRequestContext"
import { AccountJsonHardware, SigningRequest } from "@core/types"
import { Container } from "./common"
import { useParams } from "react-router-dom"

const Ledger = lazy(() => import("@ui/domains/Sign/Ledger"))

export const SignRequest = () => {
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

  return (
    <Container>
      <Header text={<PendingRequests />}></Header>
      <Content>
        {account && request && (
          <>
            <SiteInfo siteUrl={url} />
            <div className="grow">
              <h1>Approve Request</h1>
              <h2>
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
              <Grid>
                <Button disabled={processing} onClick={reject}>
                  Cancel
                </Button>
                <Button disabled={processing} processing={processing} primary onClick={approve}>
                  Approve
                </Button>
              </Grid>
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
