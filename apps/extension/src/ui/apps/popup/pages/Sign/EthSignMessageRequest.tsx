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
import { useMemo } from "react"
import styled from "styled-components"

import { Container } from "./common"

const Message = styled.textarea<{ typed: boolean }>`
  background-color: var(--color-background-muted-3x);
  color: var(--color-mid);
  flex-grow: 1;
  text-align: left;
  margin: 0;
  padding: 1.2rem;
  border: 0;
  border-radius: var(--border-radius-small);
  margin-top: 0.8rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  resize: none;

  // if typed data, make text smaller and prevent line returns
  font-size: ${({ typed }) => (typed ? "1.2rem" : "inherit")};
  overflow-x: ${({ typed }) => (typed ? "scroll" : "hidden")};
  overflow-wrap: ${({ typed }) => (typed ? "normal" : "break-word")};
  white-space: ${({ typed }) => (typed ? "pre" : "pre-wrap")};

  ${scrollbarsStyle("var(--color-background-muted-2x)")}
`

const SignContainer = styled(Container)`
  .layout-content .children h2 {
    text-align: center;
    padding: 0;
  }

  .layout-content .children h1.no-margin-top {
    margin: 0 0 1.6rem 0;
  }

  .sign-summary {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  strong {
    color: var(--color-foreground);
    background: var(--color-background-muted);
    border-radius: 4.8rem;
    padding: 0.4rem 0.8rem;
    white-space: nowrap;
  }

  ${SimpleButton} {
    width: auto;
  }

  .center {
    text-align: center;
  }

  ${Grid} {
    margin-top: 1.6rem;
  }

  .error {
    color: var(--color-status-error);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

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
