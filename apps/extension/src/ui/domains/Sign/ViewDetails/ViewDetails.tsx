import { BalanceFormatter } from "@core/domains/balances/types"
import {
  SignerPayloadJSON,
  SignerPayloadRaw,
  SigningRequest,
  TransactionDetails,
} from "@core/domains/signing/types"
import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { encodeAnyAddress } from "@talismn/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useToken from "@ui/hooks/useToken"
import { useTokenRatesForTokens } from "@ui/hooks/useTokenRatesForTokens"
import { FC, useEffect, useMemo } from "react"
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
  const { genericEvent } = useAnalytics()
  const { request, account, chain } = usePolkadotSigningRequest(signingRequest)
  const nativeToken = useToken(chain?.nativeToken?.id)
  const rates = useTokenRatesForTokens(useMemo(() => [nativeToken], [nativeToken]))
  const nativeTokenRates = nativeToken && rates[nativeToken.id]

  const { data, type } = (request?.payload || {}) as SignerPayloadRaw
  const { tip: tipRaw } = (request?.payload || {}) as SignerPayloadJSON

  const { accountAddress, fees, feesError, tip, methodName } = useMemo(() => {
    if (!txDetails || !chain || !account) return {}

    const fees = new BalanceFormatter(
      txDetails.payment?.partialFee ?? 0,
      nativeToken?.decimals,
      nativeTokenRates
    )
    const feesError = txDetails.payment ? "" : "Failed to compute fees."

    const tip = new BalanceFormatter(tipRaw ?? "0", nativeToken?.decimals, nativeTokenRates)

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
  }, [account, chain, nativeToken?.decimals, nativeTokenRates, tipRaw, txDetails])

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
        <ViewDetailsField label="Network">{chain?.name}</ViewDetailsField>
        <ViewDetailsAmount label="Fees" error={feesError} amount={fees} token={nativeToken} />
        <ViewDetailsAmount label="Tip" amount={tip} token={nativeToken} />
        <ViewDetailsField label="Method">{methodName}</ViewDetailsField>
        <ViewDetailsTxDesc label="Description" tx={txDetails} />
        <ViewDetailsTxArgs label="Arguments" args={txDetails?.method.args} />
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
