import Layout from "@ui/apps/popup/Layout"
import styled from "styled-components"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Grid from "@talisman/components/Grid"

export const Container = styled(Layout)`
  .layout-content .children {
    color: var(--color-mid);
    text-align: center;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: 1.6rem;

    .grow {
      flex-grow: 1;
    }

    h1 {
      margin: 2.4rem 0;
      color: var(--color-foreground);
      font-size: var(--font-size-medium);
      line-height: var(--font-size-medium);
      font-weight: var(--font-weight-bold);
    }

    h2 {
      font-size: var(--font-size-normal);
      line-height: var(--font-size-xlarge);
      padding: 0 2rem;
      text-align: left;
    }
    h2.center {
      text-align: center;
    }

    .bottom {
      // flex-grow: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .error {
      color: var(--color-status-error);
      text-align: left;
      margin-top: 1rem;
    }
  }
`

export const SignContainer = styled(Container)`
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

export const Message = styled.textarea<{ typed?: boolean }>`
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
