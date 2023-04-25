import { ReactNode } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Button } from "talisman-ui"

function fallbackRender({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <div>
      <div className="pb-4">
        <p>Something went wrong:</p>
        <pre className="text-alert-error">{error.message}</pre>
      </div>
      <Button onClick={resetErrorBoundary}>Reset component</Button>
    </div>
  )
}

export const Section = ({ title, children }: { title?: ReactNode; children?: ReactNode }) => (
  <div className="my-12">
    <h3 className="text-lg">{title}</h3>
    <div className="text-body-secondary">
      <ErrorBoundary fallbackRender={fallbackRender}>
        {children && <div className="">{children}</div>}
      </ErrorBoundary>
    </div>
  </div>
)
