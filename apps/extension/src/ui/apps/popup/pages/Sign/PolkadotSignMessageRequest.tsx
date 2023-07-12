import { AccountJsonHardwareSubstrate, AccountJsonQr } from "@core/domains/accounts/types"
import { SignerPayloadRaw } from "@core/domains/signing/types"
import { AppPill } from "@talisman/components/AppPill"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { Message } from "@ui/domains/Sign/Message"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { FC, Suspense, lazy, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../../Layout/PopupLayout"
import { SignAccountAvatar } from "./SignAccountAvatar"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

export const PolkadotSignMessageRequest: FC = () => {
  const { t } = useTranslation("request")
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
    <PopupLayout>
      <PopupHeader right={<SignAccountAvatar account={account} ss58Format={chain?.prefix} />}>
        <AppPill url={url} />
      </PopupHeader>
      <PopupContent>
        {account && request && (
          <>
            <div className="text-body-secondary flex h-full w-full flex-col items-center text-center">
              <h1 className="text-body text-md my-12 font-bold leading-9">{"Sign Request"}</h1>
              <h2 className="mb-8 text-base leading-[3.2rem]">
                {t("You are signing a message with account")}{" "}
                <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
                {chain ? ` ${t("on {{chainName}}", { chainName: chain.name })}` : null}
              </h2>
              <Message
                className="w-full flex-grow"
                text={(request.payload as SignerPayloadRaw).data}
              />
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
          </>
        )}
      </PopupContent>
      <PopupFooter>
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
                  containerId="main"
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
                  containerId="main"
                />
              </Suspense>
            )}
          </>
        )}
      </PopupFooter>
    </PopupLayout>
  )
}
