import { AccountJson } from "@core/domains/accounts/types"
import { DecryptRequestIdOnly, EncryptRequestIdOnly } from "@core/domains/encrypt/types"
import { AppPill } from "@talisman/components/AppPill"
import Grid from "@talisman/components/Grid"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { useEncryptRequest } from "@ui/domains/Encrypt/EncryptRequestContext"
import { Message } from "@ui/domains/Sign/Message"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useRequest } from "@ui/hooks/useRequest"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import styled from "styled-components"

import { Content, Footer, Header } from "../Layout"
import { SignContainer } from "./Sign/common"

const SignMessage = ({
  account,
  request,
  isDecrypt,
}: {
  account: AccountJson
  request: string
  isDecrypt: boolean
}) => {
  const { t } = useTranslation("request")
  const data = useMemo(() => {
    return request
  }, [request])

  return (
    <>
      <h1 className="no-margin-top">{isDecrypt ? "Decrypt " : "Encrypt "}Request</h1>
      <h2>
        {isDecrypt
          ? t("You are decrypting some data with")
          : t("You are encrypting some data with")}
        <br />
        <AccountPill account={account} />
      </h2>
      <Message readOnly defaultValue={data} />
    </>
  )
}

const EncryptApprove = () => {
  const { t } = useTranslation("request")
  const { popupOpenEvent } = useAnalytics()
  const { id } = useParams() as EncryptRequestIdOnly | DecryptRequestIdOnly
  const req = useRequest(id)
  const { url, request, approve, reject, status, message, account, type } = useEncryptRequest(req)

  useEffect(() => {
    popupOpenEvent("encrypt")
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
                isDecrypt={type == "decrypt"}
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
                {t("Cancel")}
              </SimpleButton>
              <SimpleButton disabled={processing} processing={processing} primary onClick={approve}>
                {t("Approve")}
              </SimpleButton>
            </Grid>
          </>
        )}
      </Footer>
    </SignContainer>
  )
}

export const Encrypt = styled(EncryptApprove)`
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
