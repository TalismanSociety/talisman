import { PGPRequest } from "@core/domains/pgp/types"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Grid from "@talisman/components/Grid"
import { AccountJson } from "@core/domains/accounts/types"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { AppPill } from "@talisman/components/AppPill"
import { usePgpEncryptRequest } from "@ui/domains/PGP/PgpEncryptRequestContext"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import usePGPRequestById from "@ui/hooks/usePGPRequestById"
import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import styled from "styled-components"
import { SignContainer, Message } from "./Sign/common"

import { Content, Footer, Header } from "../Layout"

const SignMessage = ({
  account,
  request,
  isDecrypt
}: {
  account: AccountJson
  request: string
  isDecrypt: boolean
}) => {
  const data = useMemo(() => {
    return request
  }, [request])

  return (
    <>
      <h1 className="no-margin-top">{isDecrypt ? "Decrypt " : "Encrypt "}Request</h1>
      <h2>
        You are { isDecrypt ? "decrypting" : "encrypting" } some data with
        <br />
        <AccountPill account={account} />
      </h2>
      <Message readOnly defaultValue={data}/>
    </>
  )
}

const PGPSign = ({ className }: any) => {
  const { popupOpenEvent } = useAnalytics()
  const { id } = useParams() as { id: string }
  const pgpRequest = usePGPRequestById(id) as PGPRequest | undefined
  const { url, request, approve, reject, status, message, account, isDecrypt } =
    usePgpEncryptRequest(pgpRequest)

  useEffect(() => {
    popupOpenEvent("pgp")
  }, [popupOpenEvent])

  const { processing, errorMessage } = useMemo(() => {
    return {
      processing: status === "PROCESSING",
      errorMessage: status === "ERROR" ? message : "",
    }
  }, [status, message])


  return (
    <SignContainer>
      <Header text={<AppPill url={url} />}></Header>
      <Content>
        {account && request && (
          <>
            <div className="sign-summary">
              <SignMessage
                account={account}
                request={request?.payload.message as string}
                isDecrypt={isDecrypt}
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

const StyledPGPSign = styled(PGPSign)`
  .layout-header {
    .pill {
      background: var(--color-background-muted);
      color: var(--color-mid);
      font-weight: normal;
    }
  }

  .layout-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;

    h1 {
      font-size: var(--font-size-medium);
      font-weight: var(--font-weight-bold);
    }

    h2 {
      color: var(--color-mid);
      word-break: break-word;
      strong {
        color: var(--color-foreground-muted-2x);
      }
    }

    .stats {
      width: auto;
      margin: 0 auto;
      p {
        font-weight: var(--font-weight-normal);
        font-size: var(--font-size-small);
        color: var(--color-foreground-muted-2x);
        line-height: 1em;
        margin: 0.4rem 0;
        text-align: left;

        strong {
          font-weight: var(--font-weight-normal);
          text-align: right;
          min-width: 10rem;
          color: var(--color-mid);
          display: inline-block;
          margin-right: 0.4em;
        }
      }
    }
  }

  .layout-footer {
  }
`

export default StyledPGPSign