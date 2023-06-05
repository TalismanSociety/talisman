import { AccountJsonHardwareSubstrate, AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadRaw } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import { Box } from "@talisman/components/Box"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { ViewDetails } from "@ui/domains/Sign/ViewDetails/ViewDetails"
import { FC, Suspense, lazy, useEffect, useMemo } from "react"

import { Container } from "./common"
import { SignAccountAvatar } from "./SignAccountAvatar"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

export const PolkadotSignMessageRequest: FC = () => {
  const {
    url,
    request,
    approve,
    reject,
    status,
    message,
    account,
    chain,
    approveHardware,
    approveQr,
  } = usePolkadotSigningRequest()

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
      <Header
        text={<AppPill url={url} />}
        nav={<SignAccountAvatar account={account} ss58Format={chain?.prefix} />}
      ></Header>
      <Content>
        {account && request && (
          <>
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
              <ViewDetails />
            </div>
          </>
        )}
      </Content>
      <Footer>
        {account && request && (
          <>
            {account.origin !== "HARDWARE" && account.origin !== "QR" && (
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
            {account.origin === "HARDWARE" && (
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
            {account.origin === "QR" && (
              <Suspense fallback={null}>
                <QrSubstrate
                  payload={request.payload}
                  account={account as AccountJsonQr}
                  genesisHash={chain?.genesisHash ?? account?.genesisHash ?? undefined}
                  onSignature={approveQr}
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
