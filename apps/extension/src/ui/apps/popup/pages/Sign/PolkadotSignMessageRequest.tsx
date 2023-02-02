import { AccountJsonHardwareSubstrate } from "@core/domains/accounts/types"
import { SignerPayloadRaw, SigningRequest } from "@core/domains/signing/types"
import { Box } from "@talisman/components/Box"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { PendingRequests } from "@ui/domains/Sign/PendingRequests"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SiteInfo } from "@ui/domains/Sign/SiteInfo"
import { ViewDetails } from "@ui/domains/Sign/ViewDetails/ViewDetails"
import { FC, Suspense, lazy, useEffect, useMemo } from "react"

import { Container } from "./common"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

type PolkadotSignMessageRequestProps = {
  signingRequest: SigningRequest
}

export const PolkadotSignMessageRequest: FC<PolkadotSignMessageRequestProps> = ({
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

  if (isLoading) return null

  return (
    <Container>
      <Header text={<PendingRequests />}></Header>
      <Content>
        {account && request && (
          <>
            <SiteInfo siteUrl={url} />
            <div className="flex grow flex-col">
              <h1>Sign Request</h1>
              <h2 className="center">
                You are signing a message with account{" "}
                <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` on ${chain.name}` : null}
              </h2>
              <textarea
                readOnly
                className="scrollable scrollable-700 bg-black-tertiary scroll my-12 w-full grow resize-none overflow-x-auto rounded-sm p-6 font-mono text-base"
                value={(request.payload as SignerPayloadRaw).data}
              />
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
            <div className="bottom">
              {signingRequest && <ViewDetails signingRequest={signingRequest} />}
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
                <LedgerSubstrate
                  payload={(request as SigningRequest["request"]).payload}
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
