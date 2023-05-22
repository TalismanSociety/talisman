import { AccountJsonHardwareSubstrate, AccountJsonQr } from "@core/domains/accounts/types"
import { SubstrateSigningRequest } from "@core/domains/signing/types"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { InfoIcon } from "@talisman/theme/icons"
import { BalanceFormatter } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useFeeToken } from "@ui/domains/SendFunds/useFeeToken"
import { MetadataStatus } from "@ui/domains/Sign/MetadataStatus"
import { PendingRequests } from "@ui/domains/Sign/PendingRequests"
import { QrSubstrate } from "@ui/domains/Sign/Qr/QrSubstrate"
import {
  usePolkadotSigningRequest,
  usePolkadotTransaction,
  usePolkadotTransactionDetails,
} from "@ui/domains/Sign/SignRequestContext"
import { SiteInfo } from "@ui/domains/Sign/SiteInfo"
import { ViewDetails } from "@ui/domains/Sign/ViewDetails/ViewDetails"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import useToken from "@ui/hooks/useToken"
import { FC, Suspense, lazy, useEffect, useMemo } from "react"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Container } from "./common"

const LedgerSubstrate = lazy(() => import("@ui/domains/Sign/LedgerSubstrate"))

type PolkadotSignTransactionRequestProps = {
  signingRequest: SubstrateSigningRequest
}

const useSubstrateFee = (signingRequest: SubstrateSigningRequest) => {
  const payload = signingRequest.request?.payload
  const isExtrinsic = isJsonPayload(payload)
  const chain = useChainByGenesisHash(isExtrinsic ? payload.genesisHash : undefined)
  const feeToken = useFeeToken(chain?.nativeToken?.id)

  const { txDetails, analysing, error } = usePolkadotTransactionDetails(
    isExtrinsic ? signingRequest.id : undefined
  )

  const tip = useMemo(
    () => (isExtrinsic && payload.tip ? BigInt(payload.tip) : undefined),
    [isExtrinsic, payload]
  )

  const { fee, feeError } = useMemo(() => {
    if (!txDetails) return { undefined }

    const fee = txDetails.partialFee ? BigInt(txDetails.partialFee) : undefined
    const feeError = txDetails.partialFee ? "" : "Failed to compute fee."

    return { fee, feeError }
  }, [txDetails])

  const totalFee = useMemo(() => {
    if (analysing || !isExtrinsic || feeError) return undefined
    return (fee ?? 0n) + (tip ?? 0n)
  }, [analysing, fee, feeError, isExtrinsic, tip])

  return {
    totalFee,
    fee,
    tip,
    analysing,
    error,
    feeToken,
  }
}

const EstimatedFeeDetails: FC<{ tokenId?: TokenId; fee?: bigint; tip?: bigint }> = ({
  tokenId,
  fee,
  tip,
}) => {
  const token = useToken(tokenId)

  const { strFee, strTip } = useMemo(() => {
    if (!token || tip === undefined || fee === undefined)
      return { strFee: undefined, strTip: undefined }

    const balFee = new BalanceFormatter(fee, token.decimals)
    const balTip = new BalanceFormatter(tip, token.decimals)

    const [intFee, decFee = ""] = balFee.tokens.split(".")
    const [intTip, decTip = ""] = balTip.tokens.split(".")
    const maxDecimals = Math.max(decFee.length ?? 0, decTip.length ?? 0)

    return maxDecimals === 0
      ? {
          strFee: `${intFee} ${token.symbol}`,
          strTip: tip > 0n ? `${intTip} ${token.symbol}` : "None",
        }
      : {
          strFee: `${intFee}.${decFee.padEnd(maxDecimals, "0")} ${token.symbol}`,
          strTip:
            tip > 0n ? `${intTip}.${decTip.padEnd(maxDecimals, "0")} ${token.symbol}` : "None",
        }
  }, [fee, tip, token])

  if (!strFee) return null

  return (
    <div className="space-y-1">
      <div className="flex w-full items-center justify-between gap-5">
        <div>Fee:</div>
        <div className="font-mono">{strFee}</div>
      </div>
      <div className="flex w-full items-center justify-between gap-5">
        <div>Tip:</div>
        <div className="font-mono">{strTip}</div>
      </div>
    </div>
  )
}

const EstimatedFeesRow: FC<PolkadotSignTransactionRequestProps> = ({ signingRequest }) => {
  const { totalFee, feeToken, analysing, error, fee, tip } = useSubstrateFee(signingRequest)

  return (
    <div className="text-body-secondary mb-8 flex w-full items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span>Estimated Fee </span>
        {/* TODO - check chaindata if chain can use */}
        {false && (
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
          <div className="bg-grey-800 rounded-xs h-8 w-72 animate-pulse"></div>
        ) : error ? (
          <Tooltip placement="bottom-end">
            <TooltipTrigger>Unknown</TooltipTrigger>
            <TooltipContent>{error}</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip placement="bottom-end">
            <TooltipTrigger>
              <TokensAndFiat planck={totalFee} tokenId={feeToken?.id} noTooltip />
            </TooltipTrigger>
            <TooltipContent>
              <EstimatedFeeDetails tokenId={feeToken?.id} fee={fee} tip={tip} />
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
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
    approveQr,
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

  const viewDetailsProps = { signingRequest, analysing, txDetails, txDetailsError }

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
              <div className="mt-8">{signingRequest && <ViewDetails {...viewDetailsProps} />}</div>
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
            <EstimatedFeesRow signingRequest={signingRequest} />
            {account.origin !== "HARDWARE" && account.origin !== "QR" && (
              <div className="grid w-full grid-cols-2 gap-12">
                <Button disabled={processing} onClick={reject}>
                  Cancel
                </Button>
                <Button
                  disabled={processing || !isReady}
                  processing={processing}
                  primary
                  onClick={approve}
                >
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
    </Container>
  )
}
