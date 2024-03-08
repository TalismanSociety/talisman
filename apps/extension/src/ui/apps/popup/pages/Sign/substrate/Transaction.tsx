import { isJsonPayload } from "@extension/core"
import { AppPill } from "@talisman/components/AppPill"
import { validateHexString } from "@talismn/util"
import { classNames } from "@talismn/util"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { MetadataStatus } from "@ui/domains/Sign/MetadataStatus"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SubSignBody } from "@ui/domains/Sign/Substrate/SubSignBody"
import { SignViewBodyShimmer } from "@ui/domains/Sign/Views/SignViewBodyShimmer"
import { FC, useEffect, useMemo } from "react"

import { SignAccountAvatar } from "../SignAccountAvatar"
import { FooterContent } from "./FooterContent"

export const PolkadotSignTransactionRequest: FC = () => {
  const { isDecodingExtrinsic, url, request, status, message, account, chain, payload } =
    usePolkadotSigningRequest()

  const { genesisHash, specVersion } = useMemo(() => {
    return payload && isJsonPayload(payload)
      ? {
          genesisHash: validateHexString(payload.genesisHash),
          specVersion: parseInt(payload.specVersion, 16),
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
      <PopupHeader
        className={classNames(isDecodingExtrinsic && "invisible")}
        right={<SignAccountAvatar account={account} ss58Format={chain?.prefix} />}
      >
        <AppPill url={url} />
      </PopupHeader>
      {isDecodingExtrinsic ? (
        <SignViewBodyShimmer />
      ) : (
        <>
          <PopupContent>
            <div className="scrollable scrollable-800 text-body-secondary h-full overflow-y-auto text-center">
              <SubSignBody />
            </div>
          </PopupContent>
          <PopupFooter className="animate-fade-in">
            <div className="flex w-full flex-col gap-4">
              <div id="sign-alerts-inject"></div>
              <MetadataStatus genesisHash={genesisHash} specVersion={specVersion} />
              {errorMessage && <SignAlertMessage type="error">{errorMessage}</SignAlertMessage>}
            </div>
            {account && request && <FooterContent withFee />}
          </PopupFooter>
        </>
      )}
    </PopupLayout>
  )
}
