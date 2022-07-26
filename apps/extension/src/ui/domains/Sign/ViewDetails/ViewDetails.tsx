import { BalanceFormatter } from "@core/domains/balances/types"
import {
  SignerPayloadJSON,
  SignerPayloadRaw,
  SigningRequest,
  TransactionDetails,
} from "@core/domains/signing/types"
import { encodeAnyAddress } from "@core/util"
import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { useAnalyticsGenericEvent } from "@ui/hooks/useAnalyticsGenericEvent"
import useToken from "@ui/hooks/useToken"
import { FC, useMemo } from "react"
import styled from "styled-components"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetailsAmount } from "./ViewDetailsAmount"
import { ViewDetailsButton } from "./ViewDetailsButton"
import { ViewDetailsField } from "./ViewDetailsField"
import { ViewDetailsTxArgs } from "./ViewDetailsTxArgs"
import { ViewDetailsTxDesc } from "./ViewDetailsTxDesc"

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
    ${scrollbarsStyle()}
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
  signingRequest: SigningRequest
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
  useAnalyticsGenericEvent("open sign transaction view details", { type: "substrate" })

  const { request, account, chain } = usePolkadotSigningRequest(signingRequest)
  const nativeToken = useToken(chain?.nativeToken?.id)

  const { data, type } = (request?.payload || {}) as SignerPayloadRaw
  const { tip: tipRaw } = (request?.payload || {}) as SignerPayloadJSON

  const { accountAddress, fees, feesError, tip, methodName } = useMemo(() => {
    if (!txDetails || !chain || !account) return {}

    const fees = new BalanceFormatter(
      txDetails.payment?.partialFee ?? 0,
      nativeToken?.decimals,
      nativeToken?.rates
    )
    const feesError = txDetails.payment ? "" : "Failed to compute fees."

    const tip = new BalanceFormatter(tipRaw ?? "0", nativeToken?.decimals, nativeToken?.rates)

    const accountAddress = `${encodeAnyAddress(account.address, chain.prefix ?? undefined)} (${
      account.name
    })`

    const methodName = `${txDetails.method.section} : ${txDetails.method.method}`

    return {
      accountAddress,
      fees,
      feesError,
      tip,
      methodName,
    }
  }, [account, chain, nativeToken, tipRaw, txDetails])

  return (
    <ViewDetailsContainer>
      <div className="grow">
        <div className="title">Details</div>
        <ViewDetailsField label="From" breakAll>
          {accountAddress}
        </ViewDetailsField>
        <ViewDetailsField label="Network">{chain?.name}</ViewDetailsField>
        <ViewDetailsAmount label="Fees" error={feesError} amount={fees} token={nativeToken} />
        <ViewDetailsAmount label="Tip" amount={tip} token={nativeToken} />
        <ViewDetailsField label="Method">{methodName}</ViewDetailsField>
        <ViewDetailsTxDesc label="Description" tx={txDetails} />
        <ViewDetailsTxArgs label="Arguments" args={txDetails?.method.args} />
        <ViewDetailsField label="Type">{type}</ViewDetailsField>
        <ViewDetailsField label="Data">{data}</ViewDetailsField>
        <ViewDetailsField label="Decoding error">
          {txDetailsError && <span className="error">{txDetailsError}</span>}
        </ViewDetailsField>
      </div>
      <Button onClick={onClose}>Close</Button>
    </ViewDetailsContainer>
  )
}

export const ViewDetails: FC<BaseViewDetailsProps & { analysing: boolean }> = ({
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
