import { AccountJsonAny } from "@core/domains/accounts/types"
import * as Sentry from "@sentry/browser"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { Content, Footer, Header } from "@ui/apps/popup/Layout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { useEthSignMessageRequest } from "@ui/domains/Sign/SignRequestContext"
import { dump as convertToYaml } from "js-yaml"
import { useEffect, useMemo } from "react"
import styled from "styled-components"

import {SignContainer, Message } from "./common"

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
  const { url, request, approve, reject, status, message, account, network } =
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
        {errorMessage && <p className="error">{errorMessage}</p>}
        {account && request && (
          <>
            <Grid>
              <SimpleButton disabled={processing} onClick={reject}>
                Cancel
              </SimpleButton>
              <SimpleButton disabled={processing} processing={processing} primary onClick={approve}>
                Approve
              </SimpleButton>
            </Grid>
          </>
        )}
      </Footer>
    </SignContainer>
  )
}
