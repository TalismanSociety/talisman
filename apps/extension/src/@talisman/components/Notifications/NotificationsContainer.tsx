import "react-toastify/dist/ReactToastify.css"

import { ToastContainer } from "react-toastify"
import styled from "styled-components"

export const NotificationsContainer = styled(ToastContainer)`
  .Toastify__toast {
    background-color: var(--color-background-muted-3x);
    color: var(--color-foreground);
    border-radius: var(--border-radius);
    width: 33rem;
    right: 2.4rem;
    font-family: "Surt", sans-serif;
  }

  .Toastify__toast-body {
    padding: 0 0.8rem;
  }

  /* default styles for mobile invalidate our styles */
  @media only screen and (max-width: 480px) {
    &.Toastify__toast-container--top-right {
      width: auto;
      left: auto;
      top: 2.4rem;
      right: 0;
    }
    .Toastify__toast {
      margin-bottom: 0.8rem;
      margin-right: 0;
    }
  }
`
