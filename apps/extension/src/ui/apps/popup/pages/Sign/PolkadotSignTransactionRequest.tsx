import { AccountJsonHardwareSubstrate } from "@core/domains/accounts/types"
import { SubstrateSigningRequest } from "@core/domains/signing/types"
import { Box } from "@talisman/components/Box"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { MetadataStatus } from "@ui/domains/Sign/MetadataStatus"
import { PendingRequests } from "@ui/domains/Sign/PendingRequests"
import {
  usePolkadotSigningRequest,
  usePolkadotTransaction,
} from "@ui/domains/Sign/SignRequestContext"
import { SiteInfo } from "@ui/domains/Sign/SiteInfo"
import { ViewDetails } from "@ui/domains/Sign/ViewDetails/ViewDetails"
import { FC, Suspense, lazy, useEffect, useMemo } from "react"

import { Container } from "./common"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

type PolkadotSignTransactionRequestProps = {
  signingRequest: SubstrateSigningRequest
}

export const PolkadotSignTransactionRequest: FC<PolkadotSignTransactionRequestProps> = ({
  signingRequest,
}) => {
  const {
    isLoading,
    url,
    request,
    approve,
    reject,
    status,
    message,
    account,
    chain,
    approveHardware,
  } = usePolkadotSigningRequest(signingRequest)
  const {
    isReady,
    isMetadataLoading,
    analysing,
    txDetails,
    error: txDetailsError,
    requiresMetadataUpdate,
    isMetadataUpdating,
    hasMetadataUpdateFailed,
    updateUrl,
  } = usePolkadotTransaction(signingRequest)

  const { processing, errorMessage, showMetadataStatus } = useMemo(() => {
    return {
      processing: status === "PROCESSING",
      errorMessage: status === "ERROR" ? message : "",
      showMetadataStatus:
        status !== "PROCESSING" &&
        (isMetadataUpdating || hasMetadataUpdateFailed || requiresMetadataUpdate),
    }
  }, [status, message, isMetadataUpdating, hasMetadataUpdateFailed, requiresMetadataUpdate])

  useEffect(() => {
    // force close upon success, usefull in case this is the browser embedded popup (which doesn't close by itself)
    if (status === "SUCCESS") window.close()
  }, [status])

  if (isLoading || isMetadataLoading) return null

  return (
    <Container>
      <Header text={<PendingRequests />}></Header>
      <Content>
        {account && request && (
          <>
            <SiteInfo siteUrl={url} />
            <div className="flex grow flex-col">
              <h1>Approve Request</h1>
              <h2 className="center">
                You are approving a request with account{" "}
                <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` on ${chain.name}` : null}
              </h2>
              <div className="mt-8">
                {signingRequest && (
                  <ViewDetails {...{ signingRequest, analysing, txDetails, txDetailsError }} />
                )}
              </div>
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
            {showMetadataStatus && (
              <MetadataStatus
                showUpdating={isMetadataUpdating}
                showUpdateFailed={hasMetadataUpdateFailed}
                showUpdateRequired={requiresMetadataUpdate}
                updateUrl={updateUrl}
              />
            )}
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
                  disabled={processing || !isReady}
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
