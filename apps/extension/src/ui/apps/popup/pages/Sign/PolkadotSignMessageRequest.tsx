import { AccountJsonHardwareSubstrate, AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadRaw } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { FC, Suspense, lazy, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { Container } from "./common"
import { SignAccountAvatar } from "./SignAccountAvatar"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

export const PolkadotSignMessageRequest: FC = () => {
  const { t } = useTranslation("sign")
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
              <h1>{"Sign Request"}</h1>
              <h2 className="center mb-8">
                {t("You are signing a message with account")}{" "}
                <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` ${t("on {{chainName}}", { chainName: chain.name })}` : null}
              </h2>
              <Message className="grow" text={(request.payload as SignerPayloadRaw).data} />
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
          </>
        )}
      </Content>
      <Footer>
        {account && request && (
          <>
            {account.origin !== "HARDWARE" && account.origin !== "QR" && (
              <div className="grid w-full grid-cols-2 gap-12">
                <Button disabled={processing} onClick={reject}>
                  {t("Cancel")}
                </Button>
                <Button disabled={processing} processing={processing} primary onClick={approve}>
                  {t("Approve")}
                </Button>
              </div>
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
