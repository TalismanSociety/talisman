import Button from "@talisman/components/Button"
import Grid from "@talisman/components/Grid"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useCurrentMetadataRequest from "@ui/hooks/useCurrentMetadataRequest"
import { useEffect } from "react"
import styled from "styled-components"

import Layout, { Content, Footer, Header } from "../Layout"

const Container = ({ className }: any) => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("metadata")
  }, [popupOpenEvent])

  const { request, url, approve, reject, status } = useCurrentMetadataRequest({
    onError: () => window.close(),
    onRejection: () => window.close(),
    onSuccess: () => window.close(),
  })

  return (
    <Layout className={className} isThinking={status === "PROCESSING"}>
      <Header text={"Update Metadata"} />
      <Content>
        <div>
          <h1>Your metadata is out of date</h1>
          <h2 className="font-medium">
            Approving this update will sync your metadata for the <strong>{request?.chain}</strong>{" "}
            chain from <strong>{url}</strong>
          </h2>
          <hr className="my-10" />
          <div className="stats space-y-2 text-left">
            <table>
              <tr>
                <td className="pr-4">
                  <strong>Symbol:</strong>
                </td>
                <td>{request?.tokenSymbol}</td>
              </tr>
              <tr>
                <td className="pr-4">
                  <strong>Decimals:</strong>
                </td>
                <td>{request?.tokenDecimals}</td>
              </tr>
            </table>

            <p>
              <strong>Symbol:</strong> {request?.tokenSymbol}
            </p>
            <p>
              <strong>Decimals:</strong> {request?.tokenDecimals}
            </p>
          </div>
        </div>
      </Content>
      <Footer>
        <Grid>
          <Button onClick={reject}>Cancel</Button>
          <Button primary onClick={approve}>
            Approve
          </Button>
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
