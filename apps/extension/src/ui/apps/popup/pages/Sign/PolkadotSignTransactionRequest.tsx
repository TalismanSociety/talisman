import { AccountJsonHardwareSubstrate, AccountJsonQr } from "@core/domains/accounts/types"
import { SubstrateSigningRequest } from "@core/domains/signing/types"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { AppPill } from "@talisman/components/AppPill"
import { InfoIcon, LoaderIcon } from "@talisman/theme/icons"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { MetadataStatus } from "@ui/domains/Sign/MetadataStatus"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { usePolkadotSigningRequest } from "@ui/domains/Sign/SignRequestContext"
import { SubSignBody } from "@ui/domains/Sign/Substrate/SubSignBody"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import { useExtrinsicFee } from "@ui/hooks/useExtrinsicFee"
import { FC, Suspense, lazy, useEffect, useMemo } from "react"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Container } from "./common"
import { SignAccountAvatar } from "./SignAccountAvatar"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

const useSubstrateFee = (signingRequest: SubstrateSigningRequest) => {
  const payload = signingRequest.request?.payload
  const isExtrinsic = isJsonPayload(payload)
  const chain = useChainByGenesisHash(isExtrinsic ? payload.genesisHash : undefined)
  const feeToken = useFeeToken(chain?.nativeToken?.id)

  const { data: fee, isLoading, error } = useExtrinsicFee(isExtrinsic ? payload : undefined)

  const tip = useMemo(
    () => (isExtrinsic && payload.tip ? BigInt(payload.tip) : undefined),
    [isExtrinsic, payload]
  )

  return {
    fee: fee ?? undefined,
    tip,
    analysing: isLoading,
    error: error ? (error as Error)?.message ?? "Failed to compute fee." : undefined,
    feeToken,
    isUnknownFeeToken: chain?.isUnknownFeeToken,
  }
}

const EstimatedFeesRow: FC<{ signingRequest: SubstrateSigningRequest }> = ({ signingRequest }) => {
  const { feeToken, analysing, error, fee, isUnknownFeeToken } = useSubstrateFee(signingRequest)

  return (
    <div className="text-body-secondary mb-8 flex w-full items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span>Estimated Fee </span>
        {isUnknownFeeToken && (
          <Tooltip>
            <TooltipTrigger className="flex flex-col justify-center">
              <InfoIcon className="inline-block" />
            </TooltipTrigger>
            <TooltipContent>
              We are unable to detect which currency will be used for fees in this transaction.
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div>
        {analysing ? (
          <LoaderIcon className="animate-spin-slow inline-block" />
        ) : error ? (
          <Tooltip placement="bottom-end">
            <TooltipTrigger>Unknown</TooltipTrigger>
            <TooltipContent>{error}</TooltipContent>
          </Tooltip>
        ) : (
          <TokensAndFiat planck={fee} tokenId={feeToken?.id} />
        )}
      </div>
    </div>
  )
}

export const PolkadotSignTransactionRequest: FC = () => {
  const {
    signingRequest,
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
    isLoading,
  } = usePolkadotSigningRequest()

  const { genesisHash, specVersion } = useMemo(() => {
    return payload && isJsonPayload(payload)
      ? { genesisHash: payload.genesisHash, specVersion: parseInt(payload.specVersion, 16) }
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
    <Container>
      <Header
        text={<AppPill url={url} />}
        nav={<SignAccountAvatar account={account} ss58Format={chain?.prefix} />}
      ></Header>
      <Content>
        <div className="scrollable scrollable-800 h-full overflow-y-auto">
          <SubSignBody />
        </div>
      </Content>
      {!isLoading && (
        <Footer className="animate-fade-in">
          <div className="flex w-full flex-col gap-4">
            <div id="sign-alerts-inject"></div>
            <MetadataStatus genesisHash={genesisHash} specVersion={specVersion} />
            {errorMessage && <SignAlertMessage type="error">{errorMessage}</SignAlertMessage>}
          </div>
          {account && request && (
            <>
              <EstimatedFeesRow signingRequest={signingRequest} />
              {account.origin !== "HARDWARE" && account.origin !== "QR" && (
                <div className="grid w-full grid-cols-2 gap-12">
                  <Button disabled={processing} onClick={reject}>
                    Cancel
                  </Button>
                  <Button disabled={processing} processing={processing} primary onClick={approve}>
                    Approve
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
      )}
    </Container>
  )
}
