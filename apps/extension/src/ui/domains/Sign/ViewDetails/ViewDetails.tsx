import { BalanceFormatter } from "@core/domains/balances/types"
import { SignerPayloadJSON, SignerPayloadRaw, TransactionMethod } from "@core/domains/signing/types"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { TypeRegistry } from "@polkadot/types"
import Button from "@talisman/components/Button"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { encodeAnyAddress } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useExtrinsicFee } from "@ui/hooks/useExtrinsicFee"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useEffect, useMemo } from "react"
import styled from "styled-components"
import { Drawer } from "talisman-ui"

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

const ViewDetailsContent: FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { genericEvent } = useAnalytics()
  const { request, account, chain, payload } = usePolkadotSigningRequest()
  const { data: extrinsic, error } = useExtrinsic(payload)
  const qExtrinsicFee = useExtrinsicFee(payload)
  const nativeToken = useToken(chain?.nativeToken?.id)
  const nativeTokenRates = useTokenRates(nativeToken?.id)

  const isExtrinsic = isJsonPayload(request?.payload)

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

  const { fee, feeError } = useMemo(
    () => ({
      fee: qExtrinsicFee.data
        ? new BalanceFormatter(qExtrinsicFee.data, nativeToken?.decimals, nativeTokenRates)
        : undefined,
      feeError: qExtrinsicFee.error ? "Failed to calculate fee." : "",
    }),
    [qExtrinsicFee.data, qExtrinsicFee.error, nativeToken?.decimals, nativeTokenRates]
  )

  const { decodeError, methodName, args, decodedPayload, decodedMethod } = useMemo(() => {
    if (!extrinsic) return {}

    const decodeError = error ? "Failed to decode method." : ""

    const methodName = extrinsic.method
      ? `${extrinsic.method.section} : ${extrinsic.method.method}`
      : "unknown"

    const decodedMethod = extrinsic.method.toHuman(true) as TransactionMethod
    const decoded = extrinsic.method.toHuman() as TransactionMethod
    const args = decoded?.args

    const typeRegistry = new TypeRegistry()
    const decodedPayload = typeRegistry.createType("ExtrinsicPayload", payload)

    return { decodeError, methodName, args, decodedPayload, decodedMethod }
  }, [error, extrinsic, payload])

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

        {isExtrinsic ? (
          <>
            <ViewDetailsField label="Network">{chain?.name ?? "Unknown"}</ViewDetailsField>
            <ViewDetailsAmount label="Fees" error={feeError} amount={fee} token={nativeToken} />
            <ViewDetailsAmount label="Tip" amount={tip} token={nativeToken} />
            <ViewDetailsField
              label="Decoding error"
              error={(error as Error)?.message ?? decodeError}
            />
            <ViewDetailsField label="Method">{methodName}</ViewDetailsField>
            <ViewDetailsTxDesc label="Description" method={decodedMethod} />
            <ViewDetailsTxObject label="Arguments" obj={args} />
            <ViewDetailsTxObject label="Payload" obj={decodedPayload?.toHuman()} />
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
      <Button className="shrink-0" onClick={onClose}>
        Close
      </Button>
    </ViewDetailsContainer>
  )
}

export const ViewDetails: FC = () => {
  const { isLoading } = useExtrinsic()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <ViewDetailsButton onClick={open} hide={isOpen} isAnalysing={isLoading} />
      <Drawer anchor="bottom" isOpen={isOpen && !isLoading} onDismiss={close}>
        <ViewDetailsContent onClose={close} />
      </Drawer>
    </>
  )
}
