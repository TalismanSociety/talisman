import { AccountJsonQr } from "@core/domains/accounts/types"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { validateHexString } from "@core/util/validateHexString"
import { AppPill } from "@talisman/components/AppPill"
import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { MetadataStatus } from "@ui/domains/Sign/MetadataStatus"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { SignHardwareSubstrate } from "@ui/domains/Sign/SignHardwareSubstrate"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SubSignBody } from "@ui/domains/Sign/Substrate/SubSignBody"
import { FC, Suspense, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../../Layout/PopupLayout"
import { SignAccountAvatar } from "./SignAccountAvatar"

const EstimatedFeesRow: FC = () => {
  const { t } = useTranslation("request")
  const { fee, isLoadingFee, errorFee, chain, errorDecodingExtrinsic } = usePolkadotSigningRequest()
  const feeToken = useFeeToken(chain?.nativeToken?.id)

  return (
    <div className="text-body-secondary mb-8 flex w-full items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span>{t("Estimated Fee")} </span>
        {!!chain?.isUnknownFeeToken && (
          <Tooltip>
            <TooltipTrigger className="flex flex-col justify-center">
              <InfoIcon className="inline-block" />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "We are unable to detect which currency will be used for fees in this transaction."
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div>
        {isLoadingFee ? (
          <LoaderIcon className="animate-spin-slow inline-block" />
        ) : errorFee || errorDecodingExtrinsic ? (
          <Tooltip placement="bottom-end">
            <TooltipTrigger>{t("Unknown")}</TooltipTrigger>
            <TooltipContent>{t("Failed to compute fee")}</TooltipContent>
          </Tooltip>
        ) : (
          <TokensAndFiat planck={fee ?? undefined} tokenId={feeToken?.id} />
        )}
      </div>
    </div>
  )
}

export const PolkadotSignTransactionRequest: FC = () => {
  const { t } = useTranslation("request")
  const {
    isDecodingExtrinsic,
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
    payload,
    fee,
  } = usePolkadotSigningRequest()

  const { genesisHash, specVersion } = useMemo(() => {
    return payload && isJsonPayload(payload)
      ? {
          genesisHash: validateHexString(payload.genesisHash),
          specVersion: parseInt(payload.specVersion, 16),
        }
      : {}
  }, [payload])

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
        <div className="scrollable scrollable-800 text-body-secondary h-full overflow-y-auto text-center">
          <SubSignBody />
        </div>
      </PopupContent>
      {!isDecodingExtrinsic && (
        <PopupFooter className="animate-fade-in">
          <div className="flex w-full flex-col gap-4">
            <div id="sign-alerts-inject"></div>
            <MetadataStatus genesisHash={genesisHash} specVersion={specVersion} />
            {errorMessage && <SignAlertMessage type="error">{errorMessage}</SignAlertMessage>}
          </div>
          {account && request && (
            <>
              <EstimatedFeesRow />
              {!["HARDWARE", "QR", "DCENT"].includes(account.origin ?? "") && (
                <div className="grid w-full grid-cols-2 gap-12">
                  <Button disabled={processing} onClick={reject}>
                    {t("Cancel")}
                  </Button>
                  <Button disabled={processing} processing={processing} primary onClick={approve}>
                    {t("Approve")}
                  </Button>
                </div>
              )}
              {["DCENT", "HARDWARE"].includes(account.origin ?? "") && (
                <SignHardwareSubstrate
                  fee={fee?.toString()}
                  payload={request.payload}
                  onSigned={approveHardware}
                  onCancel={reject}
                  containerId="main"
                />
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
      )}
    </PopupLayout>
  )
}
