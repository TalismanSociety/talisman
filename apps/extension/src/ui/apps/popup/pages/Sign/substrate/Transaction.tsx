import { isJsonPayload } from "@core/util/isJsonPayload"
import { hexToNumber } from "@polkadot/util"
import { validateHexString } from "@talismn/util"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { AppPill } from "@ui/components/AppPill"
import { MetadataStatus } from "@ui/domains/Sign/MetadataStatus"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SubSignBody } from "@ui/domains/Sign/Substrate/SubSignBody"
import { type FC, useEffect, useMemo } from "react"

import { SignNetworkLogo } from "../SignNetworkLogo"
import { FooterContent } from "./FooterContent"

export const PolkadotSignTransactionRequest: FC = () => {
  const { url, request, status, message, account, chain, payload } = usePolkadotSigningRequest()

  const { genesisHash, specVersion } = useMemo(() => {
    return payload && isJsonPayload(payload)
      ? {
          genesisHash: validateHexString(payload.genesisHash),
          specVersion: hexToNumber(payload.specVersion),
        }
      : {}
  }, [payload])

  const errorMessage = useMemo(() => (status === "ERROR" ? message : ""), [status, message])

  useEffect(() => {
    // force close upon success, usefull in case this is the browser embedded popup (which doesn't close by itself)
    if (status === "SUCCESS") window.close()
  }, [status])

  return (
    <PopupLayout>
      <PopupHeader right={<SignNetworkLogo network={chain} />}>
        <AppPill url={url} />
      </PopupHeader>

      <PopupContent>
        <div className="scrollable scrollable-800 h-full overflow-y-auto text-center text-body-secondary">
          <SubSignBody />
        </div>
      </PopupContent>
      <PopupFooter className="animate-fade-in">
        <div className="flex w-full flex-col gap-4">
          <div id="sign-alerts-inject"></div>
          <MetadataStatus genesisHash={genesisHash} specVersion={specVersion} />
          {errorMessage && (
            <SignAlertMessage className="mb-6" type="error">
              {errorMessage}
            </SignAlertMessage>
          )}
        </div>
        {account && request && <FooterContent isTransaction />}
      </PopupFooter>
    </PopupLayout>
  )
}
