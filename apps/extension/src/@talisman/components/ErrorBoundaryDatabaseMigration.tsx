import { MIGRATION_ERROR_MSG } from "@extension/core"
import { Component, ErrorInfo, FC, ReactNode } from "react"
import { ProcessAnimation } from "talisman-ui"

const ErrorMessage: FC = () => (
  <div className="text-whit mx-auto flex h-[60rem] w-[40rem] flex-col px-12 py-16 text-center">
    <div className="flex grow flex-col justify-center font-bold">
      <div className="text-xl">Updating Talisman</div>
      <div className="my-[4.4rem]">
        <ProcessAnimation status="processing" className="h-[15rem]" />
      </div>
      <div className="text-md">
        Adding new and improved
        <br />
        balance support
      </div>
    </div>
    <div className="balances-warning text-body-secondary bg-grey-900 rounded p-8 font-normal">
      Please note your balances may take a few seconds to refresh after the upgrade
    </div>
  </div>
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

    // bubble up the error to our main ErrorBoundary
    if (error) throw error

    return { hasError: false }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
