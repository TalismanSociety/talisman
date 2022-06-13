import styled from "styled-components"
import Layout, { Header, Content, Footer } from "../Layout"
import Button from "@talisman/components/Button"
import Grid from "@talisman/components/Grid"
import useCurrentMetadataRequest from "@ui/hooks/useCurrentMetadataRequest"
import { useAnalyticsPopupOpen } from "@ui/hooks/useAnalyticsPopupOpen"

const Container = ({ className }: any) => {
  useAnalyticsPopupOpen("metadata")

  const { request, url, approve, reject, status } = useCurrentMetadataRequest({
    onError: () => window.close(),
    onRejection: () => window.close(),
    onSuccess: () => window.close(),
  })

  return (
    <Layout className={className} isThinking={status === "PROCESSING"}>
      <Header text={"Update Metadata"} />
      <Content>
        <h1>Your metadata is out of date</h1>
        <h2>
          Approving this update will sync your metadata for the <strong>{request?.chain}</strong>{" "}
          chain from <strong>{url}</strong>
        </h2>
        <hr />
        <div className="stats">
          <p>
            <strong>Symbol:</strong> {request?.tokenSymbol}
          </p>
          <p>
            <strong>Decimals:</strong> {request?.tokenDecimals}
          </p>
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
      font-size: var(--font-size-medium);
      color: var(--color-background-muted-2x);
      word-break: break-word;
      strong {
        color: var(--color-mid);
      }
    }

    .stats {
      width: auto;
      margin: 0 auto;
      p {
        font-weight: var(--font-weight-normal);
        font-size: var(--font-size-small);
        color: var(--color-mid);
        line-height: 1em;
        margin: 0;
        text-align: left;

        strong {
          font-weight: var(--font-weight-normal);
          text-align: right;
          min-width: 10rem;
          color: var(--color-background-muted-2x);
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
