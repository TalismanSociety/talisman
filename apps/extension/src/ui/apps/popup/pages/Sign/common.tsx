import Layout from "@ui/apps/popup/Layout"
import styled from "styled-components"

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
