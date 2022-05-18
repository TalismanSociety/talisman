import { provideContext } from "@talisman/util/provideContext"

// This provider allows setting boundaries for tooltip
// For example this allows containing tooltips inside a modal

type TooltipBoundaryProviderProps = {
  refBoundary: React.RefObject<HTMLElement>
}

const useTooltipBoundaryProvider = ({ refBoundary }: TooltipBoundaryProviderProps) => {
  return {
    boundary: refBoundary.current ?? undefined,
  }
}

const [TooltipBoundaryProvider, useTooltipBoundaryPrivate] = provideContext(
  useTooltipBoundaryProvider
)

// Provider may not be present, we only use it in the modal
// Export a dedicated consumer hook that makes it optional
const useTooltipBoundary = () => {
  const { boundary } = useTooltipBoundaryPrivate()
  return boundary ?? document.getElementById("main") ?? document.getElementById("root") ?? undefined
}

export { TooltipBoundaryProvider, useTooltipBoundary }
