import { MetadataRequest } from "@polkadot/extension-base/background/types"
import Button from "@talisman/components/Button"
import Grid from "@talisman/components/Grid"
import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useMetadataRequestById } from "@ui/hooks/useMetadataRequestById"
import { FC, useCallback, useEffect } from "react"
import { useParams } from "react-router-dom"
import styled from "styled-components"

import Layout, { Content, Footer, Header } from "../Layout"

const UnstyledMetadata: FC<{ className?: string }> = ({ className }) => {
  const { id } = useParams<{ id: string }>()
  const metadataRequest = useMetadataRequestById(id)
  const { popupOpenEvent } = useAnalytics()
  useEffect(() => {
    popupOpenEvent("metadata")
  }, [popupOpenEvent])

  const approve = useCallback(async () => {
    if (!metadataRequest) return
    try {
      await api.approveMetaRequest(metadataRequest.id)
      window.close()
    } catch (err) {
      notify({ type: "error", title: "Failed to update", subtitle: (err as Error).message })
    }
  }, [metadataRequest])

  const reject = useCallback(() => {
    if (!metadataRequest) return
    api.rejectMetaRequest(metadataRequest.id)
    window.close()
  }, [metadataRequest])

  if (!metadataRequest) return null

  const { request, url } = metadataRequest

  return (
    <Layout className={className}>
      <Header text={"Update Metadata"} />
      <Content>
        <div>
          <h1>Your metadata is out of date</h1>
          <h2 className="font-medium">
            Approving this update will sync your metadata for the <strong>{request.chain}</strong>{" "}
            chain from <strong>{url}</strong>
          </h2>
          <hr className="my-10" />
          <div className="stats space-y-2 text-left">
            <p>
              <strong>Symbol:</strong> {request.tokenSymbol}
            </p>
            <p>
              <strong>Decimals:</strong> {request.tokenDecimals}
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
      </Footer>{" "}
    </Layout>
  )
}

export const Metadata = styled(UnstyledMetadata)`
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
`
