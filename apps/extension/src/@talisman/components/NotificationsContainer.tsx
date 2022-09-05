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
  }

  .Toastify__toast-body {
    padding: 0.8rem 1.6rem;
  }
`
