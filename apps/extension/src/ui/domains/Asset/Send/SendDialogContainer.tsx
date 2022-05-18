import styled from "styled-components"

export const SendDialogContainer = styled.section`
  height: 100%;

  > article,
  > form > article {
    display: block;
    height: 100%;
  }

  > footer,
  > form > footer {
    .message {
      display: block;
      line-height: 1em;
      margin-bottom: 0.4em;
      font-size: var(--font-size-small);
      color: var(--color-status-error);
    }

    .info {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-xsmall);
      color: var(--color-mid);
      margin-bottom: 1rem;

      > span {
        display: flex;
        align-items: baseline;
      }
    }

    .button {
      display: block;
      width: 100%;
    }
  }
`
