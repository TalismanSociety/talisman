import { PGPRequest } from "@core/domains/pgp/types"
import Button from "@talisman/components/Button"
import Grid from "@talisman/components/Grid"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { usePgpEncryptRequest } from "@ui/domains/PGP/PgpEncryptRequestContext"
import { SiteInfo } from "@ui/domains/Sign/SiteInfo"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import usePGPRequestById from "@ui/hooks/usePGPRequestById"
import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import styled from "styled-components"

import Layout, { Content, Footer, Header } from "../Layout"

const Container = ({ className }: any) => {
  const { popupOpenEvent } = useAnalytics()
  const { id } = useParams() as { id: string }
  const pgpRequest = usePGPRequestById(id) as PGPRequest | undefined
  const { url, request, approve, reject, status, message, account } =
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
    <Layout className={className} isThinking={status === "PROCESSING"}>
      <Header text={"Encrypt/Decrypt Request"} />
      <Content>
      {account && request && (
          <>
            <SiteInfo siteUrl={url} />
            <div className="grow">
              <h1>Approve Request</h1>
              <h2 className="center">
                You are approving a request with account{" "}
                <AccountPill account={account} prefix={undefined} />
              </h2>
            </div>
            {errorMessage && <div className="error">{errorMessage}</div>}
            <div className="bottom">
                TODO: request details
            </div>
          </>
        )}
      </Content>
      <Footer>
        <Grid>
          <Button onClick={reject}>Cancel</Button>
          <Button primary onClick={approve}>Approve</Button>
        </Grid>
      </Footer>
    </Layout>
  )
}

const StyledContainer = styled(Container)`
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

export default StyledContainer
