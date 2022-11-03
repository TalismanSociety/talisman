import { AccountJsonAny, AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { isHexString, stripHexPrefix } from "@ethereumjs/util"
import * as Sentry from "@sentry/browser"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { useEthSignMessageRequest } from "@ui/domains/Sign/SignRequestContext"
import { dump as convertToYaml } from "js-yaml"
import { Suspense, lazy, useEffect, useMemo } from "react"
import styled from "styled-components"

import { Message, SignContainer } from "./common"

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

const SignMessage = ({
  account,
  request,
  typed,
}: {
  account: AccountJsonAny
  request: string
  typed: boolean
}) => {
  const data = useMemo(() => {
    if (typed) {
      try {
        return convertToYaml(JSON.parse(request))
      } catch (err) {
        Sentry.captureException(err)
      }
    }
    if (isHexString(request)) {
      const stripped = stripHexPrefix(request)
      const buff = Buffer.from(stripped, "hex")
      // if 32 bytes display as is, can be tested when approving NFT listings on tofunft.com
      return buff.length === 32 ? request : buff.toString("utf8")
    }
    return request
  }, [request, typed])

  return (
    <>
      <h1 className="no-margin-top">SignRequest</h1>
      <h2>
        You are signing{typed ? " typed data " : " a message "}with
        <br />
        <AccountPill account={account} />
      </h2>
      <Message readOnly defaultValue={data} typed={typed} />
    </>
  )
}

export const EthSignMessageRequest = () => {
  const { url, request, approve, approveHardware, reject, status, message, account, network } =
    useEthSignMessageRequest()

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

  const isTypedData = useMemo(
    () => Boolean(request?.method?.startsWith("eth_signTypedData")),
    [request?.method]
  )

  return (
    <SignContainer>
      <Header text={<AppPill url={url} />}></Header>
      <Content>
        {account && request && network && (
          <>
            <div className="sign-summary">
              <SignMessage
                account={account}
                request={request.request as string}
                typed={isTypedData}
              />
            </div>
          </>
        )}
      </Content>
      <Footer>
        <Suspense fallback={null}>
          {errorMessage && <p className="error">{errorMessage}</p>}
          {account && request && (
            <>
              {account.isHardware ? (
                <LedgerEthereum
                  method={request.method}
                  payload={request.request}
                  account={account as AccountJsonHardwareEthereum}
                  onSignature={approveHardware}
                  onReject={reject}
                />
              ) : (
                <Grid>
                  <SimpleButton disabled={processing} onClick={reject}>
                    Cancel
                  </SimpleButton>
                  <SimpleButton
                    disabled={processing}
                    processing={processing}
                    primary
                    onClick={approve}
                  >
                    Approve
                  </SimpleButton>
                </Grid>
              )}
            </>
          )}
        </Suspense>
      </Footer>
    </SignContainer>
  )
}
