import { MIGRATION_ERROR_MSG } from "@core/db"
import SpinningHand from "@talisman/theme/images/hand_open_spin_animated_dark.gif"
import { Component, ErrorInfo, FC, ReactNode } from "react"
import styled from "styled-components"

const ErrorContainer = styled.section`
  display: flex;
  align-items: center;
  height: 100vh;
  width: 100vw;
  min-width: 36rem;
  min-height: 48rem;
  justify-content: center;
  color: var(--color-mid);
  text-align: center;

  section {
    padding: 2rem;
    width: 36rem;
    height: 48rem;
    display: flex;
    flex-direction: column;

    .content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;

      h1 {
        font-size: 3.2rem;
        font-weight: var(--font-weight-bold);
        margin: 0;
      }
      img {
        width: 20rem;
      }
      p {
        font-size: 2rem;
        margin-top: 2rem;
        margin-bottom: 1.2rem;
      }
      p.balances-warning {
        font-size: 1.4rem;
      }
    }
  }
`

const ErrorMessage: FC = () => (
  <ErrorContainer>
    <section>
      <div className="content text-white">
        <h1>Upgrading</h1>
        <h1>Talisman</h1>
        <div>
          <img className="inline-block" src={SpinningHand} alt="Talisman Spinning Hand logo" />
        </div>
        <p>Please wait</p>
        <p className="balances-warning text-body-secondary">
          Don't be alarmed if your balances are empty on initial load after this upgrade. Talisman
          may need to re-fetch all balances.
        </p>
      </div>
    </section>
  </ErrorContainer>
)

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundaryDatabaseMigration extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    if (error.message === `Error ${MIGRATION_ERROR_MSG}`) {
      return { hasError: true }
    }
    return { hasError: false }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    setTimeout(() => {
      window.location.reload()
    }, 10_000)
  }

  public render() {
    if (this.state.hasError) {
      return <ErrorMessage />
    }

    return this.props.children
  }
}
