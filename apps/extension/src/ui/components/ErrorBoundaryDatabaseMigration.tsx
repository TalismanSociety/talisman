import { MIGRATION_ERROR_MSG } from "@core/db"
import { ProcessAnimation } from "@ui/components/ProcessAnimation/ProcessAnimation"
import { Component, type ErrorInfo, type ReactNode } from "react"

const ErrorMessage = () => (
  <div className="mx-auto flex h-150 w-100 flex-col px-12 py-16 text-center text-whit">
    <div className="flex grow flex-col justify-center font-bold">
      <div className="text-xl">Updating Talisman</div>
      <div className="my-[2.75rem]">
        <ProcessAnimation status="processing" className="h-37.5" />
      </div>
      <div className="text-md">
        Adding new and improved
        <br />
        balance support
      </div>
    </div>
    <div className="balances-warning rounded bg-grey-900 p-8 font-normal text-body-secondary">
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

  // biome-ignore lint/correctness/noUnusedFunctionParameters: legacy
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
