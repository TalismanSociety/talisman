import { log } from "@common/log"
import { Component, type ErrorInfo, type ReactNode } from "react"

interface FallbackErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface FallbackErrorBoundaryState {
  hasError: boolean
}

/**
 * Error boundary that catches errors in its children and renders a fallback UI.
 * Unlike TalismanErrorBoundary, it reports nothing.
 */
export class FallbackErrorBoundary extends Component<
  FallbackErrorBoundaryProps,
  FallbackErrorBoundaryState
> {
  constructor(props: FallbackErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error): FallbackErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.warn("FallbackErrorBoundary caught an error", { error, info })
  }

  render() {
    if (this.state.hasError) {
      // Render the provided fallback UI
      return this.props.fallback
    }

    return this.props.children
  }
}
