import { BalanceFormatter } from "@core/domains/balances/types"
import {
  SignerPayloadJSON,
  SignerPayloadRaw,
  SubstrateSigningRequest,
  TransactionDetails,
} from "@core/domains/signing/types"
import isJsonPayload from "@core/util/isJsonPayload"
import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { encodeAnyAddress } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useEffect, useMemo } from "react"
import styled from "styled-components"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetailsAmount } from "./ViewDetailsAmount"
import { ViewDetailsButton } from "./ViewDetailsButton"
import { ViewDetailsField } from "./ViewDetailsField"
import { ViewDetailsTxDesc } from "./ViewDetailsTxDesc"
import { ViewDetailsTxObject } from "./ViewDetailsTxObject"

const ViewDetailsContainer = styled.div`
  background: var(--color-background);
  padding: 2.4rem;
  border-radius: 2.4rem 2.4rem 0px 0px;
  font-size: var(--font-size-small);
  line-height: 2rem;
  display: flex;
  flex-direction: column;
  max-height: 60rem;

  .grow {
    flex-grow: 1;
    overflow-y: auto;
  }

  color: var(--color-foreground-muted-2x);
  .title {
    color: var(--color-mid);
  }

  .title {
    margin-bottom: 1.6rem;
  }

  button {
    margin-top: 2.4rem;
    width: 100%;
  }

  .error {
    color: var(--color-status-error);
  }

  .warning {
    color: var(--color-status-warning);
  }
`

type BaseViewDetailsProps = {
  txDetails?: TransactionDetails | null
  txDetailsError?: string
  signingRequest: SubstrateSigningRequest
}

type ViewDetailsContentProps = BaseViewDetailsProps & {
  onClose: () => void
}

const ViewDetailsContent: FC<ViewDetailsContentProps> = ({
  onClose,
  signingRequest,
  txDetails,
  txDetailsError,
}) => {
  const { genericEvent } = useAnalytics()
  const { request, account, chain } = usePolkadotSigningRequest(signingRequest)
  const nativeToken = useToken(chain?.nativeToken?.id)
  const nativeTokenRates = useTokenRates(nativeToken?.id)

  const isTransaction = isJsonPayload(request?.payload)

  const { data, type } = (request?.payload || {}) as SignerPayloadRaw
  const { tip: tipRaw } = (request?.payload || {}) as SignerPayloadJSON

  const tip = useMemo(
    () =>
      nativeToken && tipRaw
        ? new BalanceFormatter(tipRaw, nativeToken?.decimals, nativeTokenRates)
        : undefined,
    [nativeToken, nativeTokenRates, tipRaw]
  )

  const accountAddress = useMemo(
    () =>
      account
        ? `${encodeAnyAddress(account.address, chain?.prefix ?? undefined)} (${account.name})`
        : undefined,
    [account, chain?.prefix]
  )

  const { fee, feeError, decodeError, methodName, args } = useMemo(() => {
    if (!txDetails) return {}

    const feeError = txDetails.partialFee ? "" : "Failed to compute fee."
    const decodeError = txDetails.method ? "" : "Failed to decode method."

    const fee = txDetails.partialFee
      ? new BalanceFormatter(txDetails.partialFee, nativeToken?.decimals, nativeTokenRates)
      : undefined

    const methodName = txDetails.method
      ? `${txDetails.method.section} : ${txDetails.method.method}`
      : "unknown"

    // safe deep copy
    const args = txDetails.method?.args
      ? JSON.parse(JSON.stringify(txDetails.method.args))
      : undefined
    args?.calls?.forEach?.((call: any) => {
      delete call.docs
    })

    return { fee, feeError, decodeError, methodName, args }
  }, [nativeToken?.decimals, nativeTokenRates, txDetails])

  useEffect(() => {
    genericEvent("open sign transaction view details", { type: "substrate" })
  }, [genericEvent])

  return (
    <ViewDetailsContainer className="">
      <div className="scrollable scrollable-700 grow">
        <div className="title">Details</div>
        <ViewDetailsField label="From" breakAll>
          {accountAddress}
        </ViewDetailsField>

        {isTransaction ? (
          <>
            <ViewDetailsField label="Network">{chain?.name ?? "Unknown"}</ViewDetailsField>
            <ViewDetailsAmount label="Fees" error={feeError} amount={fee} token={nativeToken} />
            <ViewDetailsAmount label="Tip" amount={tip} token={nativeToken} />
            <ViewDetailsField label="Decoding error" error={txDetailsError ?? decodeError} />
            <ViewDetailsField label="Method">{methodName}</ViewDetailsField>
            <ViewDetailsTxDesc label="Description" method={txDetails?.method} />
            <ViewDetailsTxObject label="Arguments" obj={args} />
            <ViewDetailsTxObject label="Payload" obj={txDetails?.payload} />
          </>
        ) : (
          <>
            <ViewDetailsField label="Type">{type}</ViewDetailsField>
            <ViewDetailsField label="Data">
              {data && (
                <div className="mt-2 pr-2">
                  <pre className="text-body-secondary scrollable scrollable-700 bg-black-secondary rounded-xs w-full overflow-x-auto p-4">
                    {data}
                  </pre>
                </div>
              )}
            </ViewDetailsField>
          </>
        )}
      </div>
      <Button onClick={onClose}>Close</Button>
    </ViewDetailsContainer>
  )
}

export const ViewDetails: FC<BaseViewDetailsProps & { analysing?: boolean }> = ({
  signingRequest,
  txDetails,
  txDetailsError,
  analysing,
}) => {
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <ViewDetailsButton onClick={open} hide={isOpen} isAnalysing={analysing} />
      <Drawer anchor="bottom" open={isOpen && !analysing} onClose={close}>
        <ViewDetailsContent onClose={close} {...{ signingRequest, txDetails, txDetailsError }} />
      </Drawer>
    </>
  )
}
