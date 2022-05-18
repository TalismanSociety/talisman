import { provideContext } from "@talisman/util/provideContext"
import { useOpenClose } from "@talisman/hooks/useOpenClose"

const useNavigationProvider = ({ defaultOpen = false }) => {
  return useOpenClose(defaultOpen)
}

export const [NavigationProvider, useNavigationContext] = provideContext(useNavigationProvider)
